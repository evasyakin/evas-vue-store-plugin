# evas-vue-store-plugin

Vue plugin adding layers of ORM (ModelsStore, Model, Relation, Query), Api (+mocks), Validation (Field validator)

## install
```
npm i evas-vue-store-plugin
```

## Models syntax
```js
import { Post } from './Post.js'
export class User {
    setFields() {
        return {
            id: this.number(),
            name: this.string('John Doe'),
            hobbies: this.array(this.string(), ['travel', 'games'])
        }
    }
    setRelations() {
        return {
            posts: this.hasMany(Post, 'user_id', 'id')
        }
    }
}
```

## Add plugin
```js
const app = createApp(App/** root component */)
.use(EvasVueStorePlugin, {
    models: { User, Post }, // models
    api: { // api endpoints
        user_list: (args, cb) => {
            // return data from api
        }
    }
})
```
