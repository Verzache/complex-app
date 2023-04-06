const postsCollection = require('../db').db().collection("posts")
const followsCollection = require('../db').db().collection("follows")
const usersCollection = require('../db').db().collection("users")
const ObjectID = require('mongodb').ObjectID
const User = require('./User')


let Post = function(data,userid, requestedPostId){
    this.data = data
    this.errors = []
    this.userid = userid
    this.requestedPostId = requestedPostId
}

Post.prototype.cleanup = function(){
    if(typeof(this.data.title) != "string"){this.data.title = ""}
    if(typeof(this.data.body) != "string"){this.data.body = ""}
    
    // get rid of bogus properties
    this.data = {
        title: this.data.title.trim(),
        body: this.data.body.trim(),
        createDate: new Date(),
        author: ObjectID(this.userid)
    }
}

Post.prototype.validate = function(){
    if(this.data.title == ""){this.errors.push("Title can't be blank.")}
    if(this.data.title == ""){this.errors.push("You must provide post content.")}
}

Post.prototype.create = function(){
    return new Promise((resolve,reject) => {
        this.cleanup()
        this.validate()
        if(!this.errors.length){
            // save post into database
            postsCollection.insertOne(this.data).then((info)=>{
                resolve(info.ops[0]._id)
                // this resolves brandly new created id for edited post
            }).catch(()=>{
                this.errors.push("Please try again later.")
                reject(this.errors)
            })
        }
        else{
            reject(this.errors)
        }
    })
}

Post.prototype.update = function(){
    return new Promise(async(resolve,reject)=>{
        try{
            let post = await Post.findSingleById(this.requestedPostId ,this.userid)
            if(post.isVisiterOwner){
                // can update db
                let status = await this.actuallyUpdate()
                resolve(status)
            }
            else{
                reject()
            }
        } catch{
            reject()
        }
    })
}

Post.prototype.actuallyUpdate = function(){
    return new Promise(async(resolve,reject)=>{
        this.cleanup()
        this.validate()
        if(!this.errors.length){
            await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)},{$set: {title: this.data.title, body: this.data.body}})
            resolve("success")
        }
        else{
            resolve("failure")
        }        
    })
}

Post.reusablePostQuery = function(uniqueOperations,visitorId, finalOperations = []){
    return new Promise(async function(resolve,reject){
        let aggOperations = uniqueOperations.concat([
            {$lookup: {from: "users",localField: "author", foreignField: "_id",as: "authorDocument"}},
            {$project: {
                title: 1,
                body: 1,
                createDate: 1,
                authorId: "$author",
                author: {$arrayElemAt: ["$authorDocument",0]}
            }} 
            // 1 = true ; 0 = false
            // in mongo db the $(dollar sign) within "" knows that u r talking about field and not string value.
        ]).concat(finalOperations)
        // aggregate() let us run multiple operation
        let posts = await postsCollection.aggregate(aggOperations).toArray()      
        
        // cleanup author pproperty in each post object
        posts = posts.map(function(post){
            post.isVisiterOwner = post.authorId.equals(visitorId) // equals() return true or false
            post.authorId = undefined
            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })
        resolve(posts)
    })
}

Post.findSingleById = function(id,visitorId){
    return new Promise(async function(resolve,reject){
        if(typeof(id) != "string" || !ObjectID.isValid(id)){
            reject()
            return
        }
        // aggregate() let us run multiple operation
        
        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectID(id)}}
        ], visitorId)

        if(posts.length){
            //console.log(posts[0])
            resolve(posts[0])
        }
        else{
            reject()
        }
    })
}

Post.findByAuthorId = function(authorId){
    return Post.reusablePostQuery([
        {$match: {author: authorId}},
        {$sort: {createDate: -1}}
        // 1 for ascending, -1 for descending
    ])
}

Post.delete = function(postIdToDelete, currentUserId){
    return new Promise(async (resolve,reject)=>{
        try{
            let post = await Post.findSingleById(postIdToDelete, currentUserId)
            if(post.isVisiterOwner){
                await postsCollection.deleteOne({_id: new ObjectID(postIdToDelete)})
                resolve()
            }else{
                reject()
            }
        }
        catch{
            reject()
        }
    })
}

Post.search = function(searchTerm){
    return new Promise(async (resolve,reject)=>{
        if(typeof(searchTerm) == "string"){
            let posts = await Post.reusablePostQuery([
                {$match: {$text: {$search: searchTerm}}}
            ],undefined,[{$sort: {score: {$meta: "textScore"}}}])// looking for relevant search terms in database
            resolve(posts)
        }else{
            reject()
        }
    })
}

Post.searchUser = function(searchTerm){
    return new Promise(async (resolve,reject)=>{
        if(typeof(searchTerm) == "string"){
            let posts = await Post.reusablePostQuery([
                {$match: {$text: {$search: searchTerm}}}
            ],undefined,[{$sort: {score: {$meta: "textScore"}}}])// looking for relevant search terms in database
            resolve(posts)
        }else{
            reject()
        }
    })
}

Post.countPostsByAuthor = function(id){
    return new Promise(async(resolve,reject)=>{
        let postCount = await postsCollection.countDocuments({author: id})
        resolve(postCount)
    })
}

Post.getFeed = async function(id){
    // create an array of user ids  the user follows
    let followedUsers = await followsCollection.find({authorId: new ObjectID(id)}).toArray()
    followedUsers = followedUsers.map(function(followDoc){
        return followDoc.followedId
    })
    //look for posts where author is in above array of followed users
    return Post.reusablePostQuery([
        {$match: {author: {$in: followedUsers}}},
        {$sort: {createDate: -1}} // -1 to keep latest post first
    ])
}

module.exports = Post