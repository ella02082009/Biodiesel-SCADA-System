import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { AlertTriangle, Power, Thermometer, Droplet, Activity, ShieldAlert, Cpu } from 'lucide-react';


const socket = io('http://localhost:5000');

export default function App() {
  const [scadaMetrics, setScadaMetrics] = useState({
    temperature: 26.5,
    tankLevel: 0,
    pump1Oil: false,
    pump2Cat: false,
    mixerMotor: false,
    miniHeater: false
  });

  const [estopActive, setEstopActive] = useState(false);
  const [tempHistory, setTempHistory] = useState(Array(20).fill(26.5));
  const canvasRef = useRef(null);
  const [mixerRotation, setMixerRotation] = useState(0);

  useEffect(() => {
    let rafId;
    let last = Date.now();
    const step = () => {
      // only animate if mixerMotor is active
      if (scadaMetrics.mixerMotor) {
        const now = Date.now();
        // derive rotation based on time delta to keep animation smooth
        setMixerRotation(prev => (prev + (now - last) * 0.06) % 360);
        last = now;
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [scadaMetrics.mixerMotor]);

  useEffect(() => {
    // Listen directly to the Socket.io Stream from the backend
    socket.on('telemetry_stream', (incomingData) => {
      if (incomingData.estop) {
        setEstopActive(true);
      }
      setScadaMetrics(incomingData);
      
      // Update historical array for the scrolling line graph
      setTempHistory(prev => [...prev.slice(1), incomingData.temperature]);
    });

    return () => socket.off('telemetry_stream');
  }, []);

  // HTML5 Canvas implementation for the real-time scrolling graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid Lines
    ctx.strokeStyle = '#1e1e27';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 25) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Draw scrolling telemetry trend line
    ctx.strokeStyle = estopActive ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const step = canvas.width / (tempHistory.length - 1);
    
    tempHistory.forEach((temp, index) => {
      // Map temperature range (20°C - 70°C) to canvas height
      const y = canvas.height - ((temp - 20) / 50) * canvas.height;
      const x = index * step;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [tempHistory, estopActive]);

  // Command Intercept Router
  const toggleActuator = (relayKey, currentVal) => {
    if (estopActive) return; // Block commands if safety intercept is active
    socket.emit('control_toggle', { targetRelay: relayKey, state: !currentVal });
  };

  // Live Remote Emergency Stop UI Intercept[cite: 1]
  const triggerEmergencyStop = () => {
    setEstopActive(true);
    socket.emit('emergency_stop', { estop: true });
  };

  const resetSystem = () => {
    setEstopActive(false);
    socket.emit('emergency_reset', { estop: false });
  };

  return (
    <div style={{ backgroundColor: '#0f0f12', color: '#e2e8f0', minHeight: '100vh', padding: '30px', fontFamily: 'monospace' }}>
      
      {/* SCADA HMI Header */}
      <header style={{ borderBottom: '2px solid #1f1f29', paddingBottom: '15px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={24} color={estopActive ? '#ef4444' : '#22c55e'} />
            <h1 style={{ color: '#ffffff', margin: 0, fontSize: '22px', letterSpacing: '1px', fontWeight: 'bold' }}>BIODIESEL PROCESS VISUALIZATION</h1>
          </div>
          <p style={{ color: '#696975', margin: '4px 0 0 0', fontSize: '12px' }}>SUPERVISORY CONTROL AND DATA ACQUISITION (SCADA) INTERFACE[cite: 1]</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px' }}>
          <div style={{ color: estopActive ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
            STATUS: {estopActive ? 'CRITICAL SYSTEM INTERCEPT ACTIVE' : 'NODE-LINK STABLE'}
          </div>
          <div style={{ color: '#696975', marginTop: '2px' }}>DATA LAYER: AZURE COSMOS DB // WEBSOCKETS[cite: 1]</div>
        </div>
      </header>

      {/* Safety Alert Banner */}
      {estopActive && (
        <div style={{ backgroundColor: '#2a1215', border: '1px solid #ef4444', borderRadius: '4px', padding: '15px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <AlertTriangle color="#ef4444" size={24} className="animate-pulse" />
          <div>
            <strong style={{ color: '#ef4444', display: 'block' }}>E-STOP INTERCEPT TRIPPED[cite: 1]</strong>
            <span style={{ fontSize: '13px', color: '#fca5a5' }}>All edge relay logic gates have been forced wide-open. Manual actuator commands are currently overridden.</span>
          </div>
          <button onClick={resetSystem} style={{ marginLeft: 'auto', background: '#ef4444', color: '#000', border: 'none', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' }}>
            RESET SYSTEM
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
        
        {/* Left Column: Process Flow & Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Animated SVG Pipeline Flow Chart[cite: 1] */}
          <div style={{ background: '#141419', padding: '20px', borderRadius: '6px', border: '1px solid #1f1f29' }}>
            <h3 style={{ color: '#8a8a98', marginTop: 0, fontSize: '14px', borderBottom: '1px solid #1f1f29', paddingBottom: '8px' }}>[01] DYNAMIC PROCESS FLOW HMI DIAGRAM[cite: 1]</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <svg width="460" height="200" viewBox="0 0 460 200" style={{ background: '#0b0b0d', borderRadius: '4px' }}>
                {/* Flow Pipelines */}
                <path d="M 40 50 L 160 50 L 160 110" fill="none" stroke={scadaMetrics.pump1Oil ? '#3b82f6' : '#222'} strokeWidth="6" />
                <path d="M 40 150 L 160 150 L 160 110" fill="none" stroke={scadaMetrics.pump2Cat ? '#eab308' : '#222'} strokeWidth="6" />
                <path d="M 160 110 L 260 110" fill="none" stroke={(scadaMetrics.pump1Oil || scadaMetrics.pump2Cat) ? '#a855f7' : '#222'} strokeWidth="8" />

                {/* Animated Flow Particles inside the streams[cite: 1] */}
                {scadaMetrics.pump1Oil && <circle r="4" fill="#60a5fa"><animateMotion dur="2s" repeatCount="indefinite" path="M 40 50 L 160 50 L 160 110" /></circle>}
                {scadaMetrics.pump2Cat && <circle r="4" fill="#fde047"><animateMotion dur="2s" repeatCount="indefinite" path="M 40 150 L 160 150 L 160 110" /></circle>}

                {/* Feed Source 1 Box */}
                <rect x="15" y="30" width="50" height="40" rx="3" fill="#141419" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="40" y="54" fill="#3b82f6" fontSize="10" textAnchor="middle" fontWeight="bold">OIL[cite: 1]</text>

                {/* Feed Source 2 Box */}
                <rect x="15" y="130" width="50" height="40" rx="3" fill="#141419" stroke="#eab308" strokeWidth="1.5" />
                <text x="40" y="154" fill="#eab308" fontSize="10" textAnchor="middle" fontWeight="bold">CAT[cite: 1]</text>

                {/* Central Continuous Stirred Tank Reactor (CSTR) */}
                <rect x="260" y="45" width="120" height="120" rx="8" fill="#141419" stroke={scadaMetrics.miniHeater ? '#f97316' : '#4b5563'} strokeWidth="2.5" />
                <text x="320" y="100" fill="#fff" fontSize="12" textAnchor="middle" fontWeight="bold">REACTOR TANK[cite: 1]</text>
                
                {/* Dynamic Mixer Blade Graphic */}
                <g transform={`translate(320, 115) rotate(${scadaMetrics.mixerMotor ? (Date.now() / 10) % 360 : 0})`}>
                  <line x1="-30" y1="0" x2="30" y2="0" stroke={scadaMetrics.mixerMotor ? '#22c55e' : '#4b5563'} strokeWidth="3" />
                  <circle r="5" fill="#fff" />
                </g>

                {/* Virtual Liquid Volume Rendering */}
                <rect x="265" y={160 - (scadaMetrics.tankLevel * 0.95)} width="110" height={scadaMetrics.tankLevel * 0.95} fill="#3b82f6" fillOpacity="0.15" />
              </svg>
            </div>
          </div>

          {/* Real-time Scrolling Recharts Line Graph Alternative[cite: 1] */}
          <div style={{ background: '#141419', padding: '20px', borderRadius: '6px', border: '1px solid #1f1f29' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #1f1f29', paddingBottom: '8px' }}>
              <h3 style={{ color: '#8a8a98', margin: 0, fontSize: '14px' }}>[02] THERMAL TELEMETRY SCROLLING TREND[cite: 1]</h3>
              <span style={{ color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Activity size={14} /> LIVE TRACKING
              </span>
            </div>
            <canvas ref={canvasRef} width="500" height="140" style={{ width: '100%', background: '#0b0b0d', borderRadius: '4px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#52526b', marginTop: '5px' }}>
              <span>HISTORICAL BOUNDS (-20s)</span>
              <span>LIVE BUFFER FEED (0s)</span>
            </div>
          </div>

        </div>

        {/* Right Column: Instrument Telemetry Bus & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Sensor Instrument Readouts */}
          <div style={{ background: '#141419', padding: '20px', borderRadius: '6px', border: '1px solid #1f1f29' }}>
            <h3 style={{ color: '#8a8a98', marginTop: 0, fontSize: '14px', borderBottom: '1px solid #1f1f29', paddingBottom: '8px' }}>[03] LIVE INSTRUMENT BUS[cite: 1]</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
              {/* Temperature Display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#0b0b0d', padding: '15px', borderRadius: '4px' }}>
                <Thermometer color={scadaMetrics.temperature > 50 ? '#f97316' : '#22c55e'} size={24} />
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontSize: '11px', color: '#696975', display: 'block' }}>[DS18B20] REACTOR CORE TEMPERATURE[cite: 1]</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>{scadaMetrics.temperature.toFixed(2)} °C</span>
                </div>
              </div>

              {/* Tank Volume Display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#0b0b0d', padding: '15px', borderRadius: '4px' }}>
                <Droplet color="#3b82f6" size={24} />
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontSize: '11px', color: '#696975', display: 'block' }}>REACTOR COMPARTMENT CAPACITY[cite: 1]</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>{scadaMetrics.tankLevel.toFixed(1)} %</span>
                  <div style={{ width: '100%', backgroundColor: '#141419', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${scadaMetrics.tankLevel}%`, backgroundColor: '#3b82f6', height: '100%', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actuator Relay Loop Controls[cite: 1] */}
          <div style={{ background: '#141419', padding: '20px', borderRadius: '6px', border: '1px solid #1f1f29' }}>
            <h3 style={{ color: '#8a8a98', marginTop: 0, fontSize: '14px', borderBottom: '1px solid #1f1f29', paddingBottom: '8px' }}>[04] PERIPHERAL ACTUATOR STEPPING LOGIC</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
              {[
                { id: 'pump1Oil', tag: 'RELAY CH1', name: '12V FEED PUMP 1 (OIL)[cite: 1]', activeColor: '#3b82f6' },
                { id: 'pump2Cat', tag: 'RELAY CH2', name: '12V FEED PUMP 2 (CATALYST)[cite: 1]', activeColor: '#eab308' },
                { id: 'mixerMotor', tag: 'RELAY CH3', name: '12V MIXER AGITATOR MOTOR[cite: 1]', activeColor: '#22c55e' },
                { id: 'miniHeater', tag: 'RELAY CH4', name: '5V MINI THERMAL HEATER[cite: 1]', activeColor: '#f97316' }
              ].map((actuator) => {
                const isActive = scadaMetrics[actuator.id];
                return (
                  <div key={actuator.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#0b0b0d', borderRadius: '4px', borderLeft: `4px solid ${isActive ? actuator.activeColor : '#222'}` }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#696975', display: 'block' }}>{actuator.tag}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{actuator.name}</span>
                    </div>
                    <button
                      onClick={() => toggleActuator(actuator.id, isActive)}
                      disabled={estopActive}
                      style={{
                        cursor: estopActive ? 'not-allowed' : 'pointer',
                        padding: '6px 12px',
                        background: isActive ? actuator.activeColor : '#1f1f29',
                        color: isActive ? '#000' : '#a1a1aa',
                        border: 'none',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: estopActive ? 0.3 : 1
                      }}
                    >
                      <Power size={12} />
                      {isActive ? 'ACTIVE' : 'IDLE'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hard Trigger Remote Emergency Intercept Panel[cite: 1] */}
          <button
            onClick={triggerEmergencyStop}
            disabled={estopActive}
            style={{
              width: '100%',
              backgroundColor: estopActive ? '#221012' : '#7f1d1d',
              color: estopActive ? '#ef4444' : '#ffffff',
              border: `1px solid ${estopActive ? '#ef4444' : 'transparent'}`,
              padding: '16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: estopActive ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              letterSpacing: '1px'
            }}
          >
            <ShieldAlert size={18} />
            {estopActive ? 'EMERGENCY INTERCEPT LOCKED' : 'EXECUTE REMOTE EMERGENCY STOP[cite: 1]'}
          </button>

        </div>
      </div>
    </div>
  );
}