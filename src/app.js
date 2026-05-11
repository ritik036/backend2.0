import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// cookie parser is used to read user s browser s cookies from server, and also to modify user s browser s cookies. CRUD operations.

export const app = express();
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(
    express.json({
        limit: "16kb",
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "16kb",
    })
);

app.use(express.static());

app.use(cookieParser());
