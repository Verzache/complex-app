const dotenv = require('dotenv')
dotenv.config()
const mongodb = require('mongodb')

// connectionString is saved in .env file ( for security reasons)
//proccess.env.(variable name) is used to access that value
mongodb.connect(process.env.CONNECTIONSTRING,{useNewUrlParser: true, useUnifiedTopology: true},function(err,client){
    module.exports = client
    const app = require('./app')
    app.listen(process.env.PORT)
})
