import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './config/db.js'
import route from './routes/userRoute.js'
import routes from './routes/projectRoute.js'
import router from './routes/taskRoute.js'
import routers from './routes/commentRoute.js'
import routem from './routes/inviteRoutes.js'

const app = express();

dotenv.config()

app.use(express.json())
app.use(cors({
   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
   credentials: true
}))
app.use("/user", route)
app.use("/project", routes)
app.use("/task", router)
app.use("/comment", routers)
app.use("/invite", routem)

const URL = process.env.MONGO_DB;
const PORT = process.env.PORT || 3005;

if (!URL) {
   console.error("CRITICAL: MongoDB url (MONGO_DB) is missing in .env file")
   process.exit(1)
}

if (!process.env.JWT_SECRET) {
   console.error("CRITICAL: JWT_SECRET is missing in .env file. Running without one is insecure.")
   process.exit(1)
}

async function Main() {
   try {
      await connectDB(URL as String)
      app.listen(PORT, () => {
         console.log(`Server started on Port ${PORT}`)
      })

   }
   catch (error) {
      console.log("Failed to Connect")
      process.exit(1)
   }
}

Main();