import express from "express";
import {
    Server
} from "socket.io";
import http from "http";
import path from 'path';
import { instrument } from '@socket.io/admin-ui';

const __dirname = path.resolve();

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/src/views");
app.use("/public", express.static(__dirname + "/src/public"))
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log('Listen on http://localhost:3000')

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer);

wsServer.on("connection", socket=> {
    socket.on("check_room",(roomName, done)=>{
        console.log("rooms",wsServer.sockets.adapter.rooms);
        const participants = wsServer.sockets.adapter.rooms.get(roomName)?.size;
        console.log("room",roomName,wsServer.sockets.adapter.rooms.get(roomName));
        const isValid = (!participants || participants < 2) ? true : false;
        console.log(participants);
        console.log(isValid);
        done(isValid);
    });
    
    socket.on("join_room", (roomName) => {
            socket.join(roomName);
            socket.to(roomName).emit("welcome");
    })

    socket.on("offer",(offer,roomName) => {
        socket.to(roomName).emit("offer", offer);
    })
    socket.on("answer",(answer,roomName) => {
        socket.to(roomName).emit("answer", answer);
    })
    socket.on("ice",(ice,roomName) => {
        socket.to(roomName).emit("ice", ice);
    })
})

httpServer.listen(3000, handleListen);