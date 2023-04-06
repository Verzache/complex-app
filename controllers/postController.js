const Post = require('../models/Post')

exports.viewCreateScreen = function(req,res){
    res.render('create-post')
}

exports.create = function(req,res){
    let post = new Post(req.body, req.session.user._id)
    post.create().then(function(newId){
        req.flash("success","New post successfully created.")
        req.session.save(()=> {res.redirect(`/post/${newId}`)})
    }).catch(function(errors){
        errors.forEach((error)=>{req.flash("errors",error)})
        req.session.save(()=> {res.redirect('/create-post')})
    })
}

exports.viewSingle = async function(req,res){
    try{
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen.ejs', {post: post, title: post.title})
    }catch{
        res.render('404.ejs')
    }
}

exports.viewEditScreen = async function(req, res) {
    try {
      let post = await Post.findSingleById(req.params.id, req.visitorId)
      if (!post.isVisitorOwner) {
        res.render("edit-post", {post: post})
      } else {
        req.flash("errors", "You do not have permission to 1  perform that action.")
        req.session.save(() => res.redirect("/"))
      }
    } catch {
      res.render("404")
    }
  }

exports.edit = function(req,res){
    let post = new Post(req.body, req.visitorId, req.params.id)
    post.update().then((status)=>{
        // post was succesfully updated
        // or user had permission  but there were validation errors
        if(status == "success"){
            //post was updated in db
            req.flash("success", "Post successfully updated")
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
        else{
            post.errors.forEach(function(error){
                req.flash("errors", error)
            })
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(()=>{
        // a post with request id doesnt exist
        // or current owner vistier is not owner of requested post
        req.flash("errors","You dont have permission to perform the following action.")
        req.session.save(function(){
            res.redirect("/")
        })
    })
}

exports.delete = function(req, res){
    Post.delete(req.params.id, req.visitorId).then(()=>{
        req.flash("success","Post successfully deleted.")
        req.session.save(()=>{res.redirect(`/profile/${req.session.user.username}`)})
    }).catch(()=>{
        req.flash("errors","You dont have permission to perform the following data.")
        req.session.save(()=> res.redirect('/'))
    })
}

exports.search = function(req,res){
    Post.search(req.body.searchTerm).then(posts => {
        res.json(posts)
    }).catch(()=>{
        console.log("catch error")
        res.json([])
    })
}
// for user search
exports.searchUser = function(req,res){
    Post.searchUser(req.body.searchTerm).then(posts => {
        res.json(posts)
    }).catch(()=>{
        console.log("catch error")
        res.json([])
    })
}