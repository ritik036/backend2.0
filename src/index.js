import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import { DB_NAME } from "./constants.js ";


// Second Approach :- write DB code seperately, then export it then import it and execute it. 
import connectDB from "./db/index.js";
dotenv.config();

connectDB()









// First approach where we do all in one file. 
/*
dotenv.config();

const app = express();

(async function connectDB() {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (error) => {
            console.log("error occured");
            throw error;
        });
        app.listen(process.env.PORT, () => {
            console.log("app is listening on port", process.env.PORT);
        });
    } catch (error) {
        console.log("error: ", error);
        throw error;
    }
})();
*/