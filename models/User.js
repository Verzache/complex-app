const bcrypt = require('bcryptjs')
const usersCollection = require('../db').db().collection("users")
const validator = require('validator')
const md5 = require('md5')

let User = function(data,getAvatar){
    this.data = data
    this.errors = []
    if(getAvatar == undefined){getAvatar = false}
    if(getAvatar){this.getAvatar()}
}

User.prototype.cleanUp = function(){
    if(typeof(this.data.username) != "string"){this.data.username=""}
    if(typeof(this.data.email) != "string"){this.data.email=""}
    if(typeof(this.data.password) != "string"){this.data.password=""}

    // getting rid of bogus properties
    // .trim() removes extra spaces
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}

User.prototype.validate = function(){
    return new Promise(async (resolve, reject)=>{
        // "" means blank
        if (this.data.username == ""){this.errors.push("Username cannot be blank.")}
        if(this.data.username != "" && !validator.isAlphanumeric(this.data.username)){this.errors.push("Username can only contains letters and numbers.")}
        //if (this.data.email == ""){this.errors.push("Email address cannot be blank.")}
        if (this.data.password == ""){this.errors.push("Password cannot be blank.")}
        if(this.data.password.length > 0 && this.data.password.length < 5){this.errors.push("Password must be atleast 5 characters")}
        if(this.data.password.length > 15){this.errors.push("Password must not exceed 15 characters")}
        if(this.data.username.length > 0 && this.data.username.length < 3){this.errors.push("Username must be atleast 3 characters")}
        if(this.data.username.length > 10){this.errors.push("Username must not exceed 10 characters")}
        // we can use regular expression too instead of validator module to check valid email address
        if(!validator.isEmail(this.data.email)){this.errors.push("You must provide a valid email address.")}
    
        // Only if username is valid then check to see if its already taken
        if(this.data.username.length > 2 && this.data.username.length < 15 && validator.isAlphanumeric(this.data.username)){
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if(usernameExists){this.errors.push("This username is already taken.")}
        }
        // Only if email is valid then check to see if its already taken
        if(validator.isEmail(this.data.email)){
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if(emailExists){this.errors.push("This email is already in use.")}
        }
        resolve()
    })
}
// Promise: it is an object that represents eventual completion of an asynchronus operation
// Using Promise approach (#includes then(),catch() )
User.prototype.login = function(){
    return new Promise((resolve, reject) => {
        this.cleanUp()
        // arrow function for this keyword tweaking
        usersCollection.findOne({username: this.data.username}).then((attempedUser)=>{
            if(attempedUser && bcrypt.compareSync(this.data.password,attempedUser.password)){
                this.data = attempedUser
                this.getAvatar()
                resolve("congress")
            }
            else{
                reject("Invalid username/password.")
            }
        }).catch(function(){
            reject("Please try again later!")
        })
    })
}

User.prototype.register = function(){
    return new Promise(async (resolve,reject) =>{
        // step#1: Validate user data
        this.cleanUp() // cleanUp function checks if user has enterend only string data type in input field
        await this.validate() // this.validate == user.validate()
    
        // step#2: Only if there are no validation errors then save user data into database
        if(!this.errors.length){
            // hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password,salt)
            await usersCollection.insertOne(this.data)
            resolve()
        }
        else{
            reject(this.errors)
        }
    
    })
}

User.prototype.getAvatar = function(){
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username){
    return new Promise(function(resolve,reject){
        if(typeof(username)!= "string"){
            reject()
            return
        }
        usersCollection.findOne({username: username}).then(function(userDoc){
            if(userDoc){
                userDoc = new User(userDoc, true)
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    avatar: userDoc.avatar
                }
                resolve(userDoc)
            }else{
                reject()
            }
        }).catch(function(){
            reject()
        })
    })
}

User.doesEmailExist = function(email){
    return new Promise(async function(resolve,reject){
        if(typeof(email)!="string"){
            resolve(false)
            return
        }
        let user = await usersCollection.findOne({email: email})
        if(user){
            resolve(true)
        }else{
            resolve(false)
        }
    })
}

module.exports = User