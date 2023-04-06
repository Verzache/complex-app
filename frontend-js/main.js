import Search  from "./modules/search"
import Chat from './modules/chat'
import RegisterationForm from "./modules/registerationForm"
//import SearchUser from "./modules/searchUser"

if(document.querySelector("#registration-form")){
    new RegisterationForm()     
}
if(document.querySelector("#chat-wrapper")){
    new Chat()
}
if (document.querySelector(".header-search-icon")){
    new Search()
}
/*if (document.querySelector(".header-user-icon")){
    new SearchUser()
}*/