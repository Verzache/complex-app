// including express
//Tip: Use const instead of let
const express = require ('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const csrf = require('csurf')

const app = express()

let sessionOptions = session({
    secret: "JS is cool",
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000*60*60*24,httpOnly: true}
// maxAge represents how much time a cookie will last. here.1day
})

app.use(sessionOptions)
app.use(flash())

app.use(function(req,res,next){
    // make our markdown function available from within ejs template

    // make all error and success flash message avail from all templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    // make current id available on req object
    if(req.session.user){req.visitorId = req.session.user._id}
    else{req.visitorId = 0}
    // make user session data available from within view templates
    res.locals.user = req.session.user
    next()
})

// importing router.js file(kinda)
const router = require("./router.js")

app.use(express.urlencoded({extended: false}))
app.use(express.json())

app.use(express.static('public'))
// set('views'[by default],[folder name])
app.set('views','views')
app.set('view engine' ,"ejs")
// preventing site from cross site request forgery(csrf,cookie attack)
app.use(csrf())

app.use(function(req, res, next){
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use('/',router)
// csrf protection (adjusting)
app.use(function(err,req,res,next){
    if(err){
        if(err.code == "EBADCSRFTOKEN"){
            req.flash('errors','CSRF DETECTED.')
            req.session.save(()=>{res.redirect('/')})
        }else{
            res.render("404")
        }
    }
})

const server = require('http').createServer(app)
const io = require('socket.io')(server)
 
//integrating socket io with express package
io.use(function(socket,next){
    sessionOptions(socket.request,socket.request.res,next)
})

io.on('connection',function(socket){
    if(socket.request.session.user){
        let user = socket.request.session.user

        socket.emit('welcome',{username: user.username, avatar: user.avatar})

        socket.on('chatMessageFromBrowser',function(data){
            socket.broadcast.emit('chatMessageFromServer',{message: data.message,username: user.username,avatar: user.avatar})
        })
    }
})

module.exports = server

