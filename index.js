const express = require("express");
const mongoose = require("mongoose");
const jsonWebToken = require("jsonwebtoken");
const zod = require("zod");
const myMongoSecret = process.env["jwtPassword"];
const myJWTSecret = process.env["MongoConnectURL"];

const userSchema = zod.object({
  userName: zod.string(),
  password: zod.string(),
  email: zod.string().email(),
});
const todoSchema = zod.object({
  name: zod.string(),
  desc: zod.string(),
  completed: zod.boolean(),
});
const app = express();
app.use(express.json());
mongoose.connect(myMongoSecret);

const Todos = mongoose.model("todo", {
  name: String,
  desc: String,
  completed: Boolean,
});

const User = mongoose.model("user", {
  userName: String,
  password: String,
  email: String,
});

app.post("/signUp", async function (req, res) {
  const result = userSchema.safeParse(req.body);
  if (result.success) {
    const data = result.data;
    console.log(result);
    const checkIfUserExists = await User.findOne({
      userName: result.data.userName,
    });
    console.log("result for checkIfUserExists" + checkIfUserExists);
    if (checkIfUserExists) {
      res.send("User already exists");
    } else {
      console.log(data);
      const user = new User(data);
      const result = await user.save();
      const token = jsonWebToken.sign({ userName: data.userName }, myJWTSecret);
      console.log(token);
      console.log("result for signUp" + result);
      res.json({ token, status: "user signUp completed" });
    }
  } else {
    res.send(result);
  }
});

app.post("/signIn", async function (req, res) {
  let userName = req.body.userName;
  let password = req.body.password;
  const user = await User.findOne({ userName: userName });
  if (userName === user?.userName && password === user?.password) {
    const token = jsonWebToken.sign({ userName: userName }, myJWTSecret);
    res.json({ token, status: "user logged in succssfully" });
  } else {
    res.send("Invalid User Credentials");
  }
});

app.get("/todos", validateUser, async function (req, res) {
  const todos = await Todos.find();
  console.log(todos);
  res.send(todos);
});

app.get("/todo/:todo", validateUser, async function (req, res) {
  let todoName = req.params.todo;
  const todo = await Todos.find({ name: todoName });
  console.log("passed todo is : " + req.params.todo);
  res.send(todo);
});

app.post("/addTodo", validateUser, async function (req, res) {
  const result = todoSchema.safeParse(req.body);
  if (result.success) {
    const newTodo = new Todos(result.data);
    await newTodo.save();
    res.send("todo added successfully");
  }
  {
    res.send(result);
  }
});

app.delete("/deleteTodo/:todo", validateUser, async function (req, res) {
  let todoName = req.params.todo;
  console.log("deleted record was  : " + todoName);
  await Todos.deleteOne({ name: todoName });
  res.send("deleted Sucessfully...!");
});

function validateUser(req, res, next) {
  try {
    const authToken = req.headers.authorization;
    const jwtDetails = jsonWebToken.verify(authToken, myJWTSecret);
    console.log(jwtDetails);
    next();
  } catch (err) {
    return res.status(403).json({
      msg: "Invalid token",
    });
  }
}

app.listen(3000, () => {
  console.log("server started");
});
