import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import { ProtoGrpcType } from "./rpc/random"
import { RandomHandlers } from "./rpc/randomPackage/Random"
import { TodoRequest } from "./rpc/randomPackage/TodoRequest"
import { TodoResponse } from "./rpc/randomPackage/TodoResponse"
import { ChatRequest } from "./rpc/randomPackage/ChatRequest"
import { ChatResponse } from "./rpc/randomPackage/ChatResponse"


const packageDef = protoLoader.loadSync("src/proto/random.proto")
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType
const randomPackage = grpcObj.randomPackage

function main() {
  const server = getServer()

  server.bindAsync("localhost:5000", grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(err)
      return
    }
    console.log("Your server is started on port:" + port)
    server.start()
  })
}

const todoList: TodoResponse = { todos: [] }
const callObjByUsername = new Map<string, grpc.ServerDuplexStream<ChatRequest, ChatResponse>>()

function getServer() {
  const server = new grpc.Server()
  server.addService(randomPackage.Random.service, {
    PingPong: (req, res) => {
      console.log(req.request)
      res(null, { message: "Pong" })
    },
    RandomNumber: (call) => {
      const { maxVal = 10 } = call.request
      console.log(maxVal)

      let runCount = 0
      const id = setInterval(() => {
        runCount += 1
        call.write({ num: Math.floor(Math.random() * maxVal) })

        if (runCount >= 10) {
          clearInterval(id)
          call.end()
        }
      }, 500)
    },
    TodoList: (call, callback) => {
      call.on("data", (chunk: TodoRequest) => {
        console.log(chunk)
        todoList.todos?.push(chunk)
      })

      call.on("end", () => {
        callback(null, { todos: todoList.todos })
      })
    },
    Chat: (call) => {
      call.on("data", (req: ChatRequest) => {
        const username = call.metadata.get("username")[0] as string
        const msg = req.message
        console.log(`${username} ==> ${req.message}`)

        for (let [user, usersCall] of callObjByUsername) {
          if (username !== user) {
            usersCall.write({
              username: username,
              message: msg
            })
          }
        }

        if (callObjByUsername.get(username) === undefined) {
          callObjByUsername.set(username, call)
        }
      })

      call.on("end", () => {
        const username = call.metadata.get("username")[0] as string
        callObjByUsername.delete(username)
        for (let [user, usersCall] of callObjByUsername) {
          usersCall.write({
            username: username,
            message: `has left the chat`
          })
        }
        console.log(`${username} is ending their chat session`)

        call.write({
          username: "Server",
          message: `See you later ${username}`
        })

        call.end()
      })
    }
  } as RandomHandlers)

  return server
}

main()