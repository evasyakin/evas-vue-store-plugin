/**
 * Расширение модели поддержкой состоянием.
 * @package evas-vue-store-plugin
 * @author Egor Vasyakin <egor@evas-php.com>
 * @license CC-BY-4.0
 */
import { logger } from '../Log.js'
import { Relation } from '../Relation.js'

export function setModelState(Model) {
    Model.prototype.$state = {}

    /**
     * Сохранение состояния записи.
     */
    Model.prototype.$saveState = function () {
        this.$state = structuredClone(this)
        delete this.$state.$state
        delete this.$state.$displayGroup
        delete this.$state.$errors
        logger.methodCall(`${this.$entityNameWithId}.$saveState`, arguments)
    }

    /**
     * Откат изменений записи.
     * @param Array|null имена полей и/или связей
     */
    Model.prototype.$rollbackChanges = function (names) {
        const cb = field => {this[field.name] = structuredClone(this.$state[field.name])}
        this.constructor.eachFields(cb, names)
        this.constructor.eachRelations(cb, names)
    }


    /**
     * @var Boolean Является ли запись новой.
     */
    Object.defineProperty(Model.prototype, '$isNew', { get: function () {
        return this.$id ? false : true
    }})

    /**
     * @var Boolean Является ли запись "грязной" (с изменёнными, но не сохранёнными данными)
     */
    Object.defineProperty(Model.prototype, '$isDirty', { get: function () {
        return this.$dirtyFields().length > 0
    }})


    /**
     * Проверка поля на изменённость.
     * @param String|Number имя поля
     * @return Boolean
     */
    Model.prototype.$isDirtyField = function (name) {
        let stateValue
        let value
        if (fieldPath) {
            const path = [...fieldPath, name].join('->')
            stateValue = this.$getFieldValue(path, this.$state)
            value = this.$getFieldValue(path)
        } else {
            stateValue = this.$state[name]
            value = this[name]
        }
        if ([null, undefined].includes(stateValue) && value === '') return false
        return stateValue !== value
    }

    /**
     * Получение значения поля
     * @param { String } name имя поля
     * @param { Object! } source данные полей
     * @returns Any
     */
    Model.state.$getFieldValue = function (name, source) {
        let reference = source || this.$getData()
        const path = `${name ?? ''}`.split('->')
        for (const key of path) {
            if (reference == null || typeof reference !== 'object') {
                return
            }
            let validKey = key
            if (Array.isArray(reference)) {
                const num = Number(key)
                if (!Number.isNaN(num)) {
                    validKey = num
                }
            }
            reference = reference[validKey]
        }

        return reference
    }

    /**
     * Проверка связанных записей на изменённость.
     * @param String|Number|Relation имя связи или связь
     * @return Boolean
     */
    Model.prototype.$isDirtyRelateds = function (relation) {
        if (!(relation instanceof Relation)) relation = this.relation()[relation]
        let {name, local, foreign, multiple} = relation
        if (multiple) {
            if (Array.isArray(this[name])) {
                let res = false
                let ids = []
                this[name].forEach(related => {
                    if (related[foreign]) ids.push(related[foreign])
                })
                if (Array.isArray(this.$state[name])) {
                    let idsLocal = []
                    this.$state[name].forEach(related => {
                        if (related[foreign]) idsLocal.push(related[foreign])
                    })
                    res = JSON.stringify(ids.sort()) !== JSON.stringify(idsLocal.sort())
                }
                if (res && Array.isArray(this.$state?.[local])) {
                    res = JSON.stringify(ids.sort()) !== JSON.stringify(this.$state?.[local].sort())
                }
                return res
            }
        } else {
            let res = this.$state[name]?.[foreign] !== this[name]?.[foreign]
            if (res) {
                return this.$state?.[local] !== this[name]?.[foreign]
            }
        }
    }

    /**
     * Получение имён изменённых полей и связанных записей.
     * @param Array|null имена полей и/или связей
     * @return String[]
     */
    Model.prototype.$dirtyFields = function (names) {
        let dirty = []
        const onFieldFn = field => {
            if (!field) return
            if (field.type === 'array') {
                this[field.name]?.forEach((_, arrayIndex) => {
                    const dirtyArrayFields = this.$dirtyFields([field.itemOf], [...fieldPath, field.name, arrayIndex])
                    dirty.push(...dirtyArrayFields)
                })
            } else if (field.type === 'object') {
                const dirtyObjectFields = this.$dirtyFields(
                    Object.values(field.itemOf),
                    !fieldPath.includes(field.name) ? [...fieldPath, field.name] : fieldPath
                )
                dirty.push(...dirtyObjectFields)
            } else if (this.$isDirtyField(field.name, fieldPath)) dirty.push([...fieldPath, field.name].join('->'))
        }
        if (Array.isArray(names) && !(names.at(0) instanceof String)) {
            names.forEach(onFieldFn)
        } else {
            this.constructor.eachFields(callBack, names)
            this.constructor.eachRelations(relation => {
                if (this.$isDirtyRelateds(relation)) dirty.push(relation.name)
            }, names)
        }

        return dirty
    }

    /**
     * @var Object изменённые данные {key: val, ...}
     */
    Object.defineProperty(Model.prototype, '$dirtyData', { get: function () {
        let data = {}
        this.$dirtyFields().forEach(name => {
            const path = `${name ?? ''}`.split('->')
            const key = path?.at(0) ?? name
            data[key] = this[key]
            return data
        })
        return data
    }})
}
