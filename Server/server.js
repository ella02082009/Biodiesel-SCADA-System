const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server,{
    cors:{ origin: "*", methods: ["GET", "POST"] }
});

const dbURI = process.env.COSMOSDB_URI;

mongoose.connect(dbURI)
  .then(() => console.log('>>> SCADA Connected: Microsoft Azure Cosmos DB API Engine'))
  .catch(err => console.error('>>> Azure Database Connection Error: ', err));

// Persistent Batch Audit Schema
const BatchAuditSchema = new mongoose.Schema({
  temperature: Number,
  tankLevel: Number,
  pump1Oil: Boolean,
  pump2Cat: Boolean,
  mixerMotor: Boolean,
  miniHeater: Boolean,
  timestamp: { type: Date, default: Date.now }
}, { collection: 'batch_audits' });

const BatchAudit = mongoose.model('BatchAudit', BatchAuditSchema);

// Live System State tracking physical edge nodes[cite: 2]
let systemState = {
  temperature: 26.5, 
  tankLevel: 0.0,    
  pump1Oil: false,   // Relay Ch1[cite: 2]
  pump2Cat: false,   // Relay Ch2[cite: 2]
  mixerMotor: false, // Relay Ch3[cite: 2]
  miniHeater: false  // Relay Ch4[cite: 2]
};

// --- REAL-TIME HARDWARE REFINERY SIMULATOR LOOP ---
// Drives physical chemistry behaviors dynamically until physical ESP32 registers[cite: 2]
setInterval(async () => {
  if (systemState.pump1Oil && systemState.tankLevel < 100) systemState.tankLevel += 1.5;
  if (systemState.pump2Cat && systemState.tankLevel < 100) systemState.tankLevel += 0.5;
  
  if (systemState.miniHeater) {
    if (systemState.temperature < 55.0) systemState.temperature += 0.4;
    else systemState.temperature += (Math.random() - 0.5) * 0.15; // Realistic heat oscillation
  } else if (systemState.temperature > 26.5) {
    systemState.temperature -= 0.08; // Ambient cooling factor
  }

  if (systemState.tankLevel > 100) systemState.tankLevel = 100;

  // Stream data packets downstream via WebSockets to React Frontend[cite: 2]
  io.emit('telemetry_stream', systemState);

  // Auto-save batch audits securely to Azure Cosmos DB under active production changes[cite: 2]
  if (systemState.pump1Oil || systemState.pump2Cat || systemState.mixerMotor || systemState.miniHeater) {
    if (Math.random() < 0.1) { // Throttle writes roughly every 10 cycles
      try {
        const auditRecord = new BatchAudit(systemState);
        await auditRecord.save();
        console.log('>>> Automated Batch Audit Committed to Azure Cosmos DB[cite: 2]');
      } catch (err) { console.error("Azure Cosmos DB Log Write Interrupted:", err); }
    }
  }
}, 1000);

io.on('connection', (socket) => {
  console.log(`>>> Active SCADA Node Connected to Pipeline: ${socket.id}[cite: 2]`);
  socket.emit('telemetry_stream', systemState);

  // Catches incoming manual toggle clicks from React or interrupt flags from ESP32[cite: 2]
  socket.on('control_toggle', (command) => {
    const { targetRelay, state } = command;
    if (systemState.hasOwnProperty(targetRelay)) {
      systemState[targetRelay] = state;
      io.emit('telemetry_stream', systemState); // Broadcast updated state to all nodes
      console.log(`>>> System Override Signal: ${targetRelay} mutated to ${state}`);
    }
  });
});

app.post('/api/edge/telemetry', async (req, res) => {
  systemState = { ...systemState, ...req.body };
  io.emit('telemetry_stream', systemState);
  res.status(200).send({ status: 'Edge metrics synchronized across pipeline.' });
});

// Fire up the engine
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`>>> SCADA Backend Processing Engine active on Port ${PORT}[cite: 2]`));
