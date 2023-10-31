import * as grpc from "@grpc/grpc-js"
import * as protoLoader from "@grpc/proto-loader"
import { ProtoGrpcType } from "./rpc/random"
import { RandomClient } from "./rpc/randomPackage/Random"
import readline from "readline"
import { ChatResponse } from "./rpc/randomPackage/ChatResponse"


const packageDef = protoLoader.loadSync("src/proto/random.proto")
const grpcObj = (grpc.loadPackageDefinition(packageDef) as unknown) as ProtoGrpcType
const randomPackage = grpcObj.randomPackage

function main() {
  const client = new randomPackage.Random("localhost:5000", grpc.credentials.createInsecure())

  const deadline = new Date()
  deadline.setSeconds(deadline.getSeconds() + 5)
  client.waitForReady(deadline, (err) => {
    if (err) {
      console.error(err)
      return
    }

    onClientReady(client)
  })
}

function onClientReady(client: RandomClient) {
  // client.PingPong({ message: "Ping" }, (err, result) => {
  //   if (err) {
  //     console.error(err)
  //     return
  //   }
  //   console.log(result)
  // })

  // const stream = client.RandomNumber({ maxVal: 100 })
  // stream.on("data", (chunk) => {
  //   console.log(chunk)
  // })
  // stream.on("end", () => {
  //   console.log("communication ended")
  // })

  // const stream = client.TodoList((err, result) => {
  //   if (err) {
  //     console.error(err)
  //     return
  //   }
  //   console.log(result)
  // })

  // stream.write({ todo: "walk the wife", status: "never" })
  // stream.write({ todo: "walk the dog", status: "pending" })
  // stream.write({ todo: "get a real job", status: "impossible" })
  // stream.write({ todo: "feed the dog", status: "done" })
  // stream.end()

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const username = process.argv[2]
  if (!username) {
    console.error("No username, can't join chat")
    process.exit()
  }
  const metadata = new grpc.Metadata()
  metadata.set("username", username)

  const call = client.Chat(metadata)

  call.write({
    message: `${username} registered`
  })

  call.on("data", (chunk: ChatResponse) => {
    console.log(`${chunk.username} ==> ${chunk.message}`)
  })

  rl.on("line", (line) => {
    if (line === "quit") {
      call.end()
    } else {
      call.write({
        message: line
      })
    }
  })
}

main()