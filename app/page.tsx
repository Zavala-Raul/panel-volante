"use client";

import { useEffect, useState } from 'react';
import mqtt from 'mqtt';

export default function TelemetriaDashboard() {
  const [estadoConexion, setEstadoConexion] = useState('Desconectado');
  const [datosVolante, setDatosVolante] = useState({
    vehiculo_id: 'TRK-007',
    manos_en_volante: true,
    duracion_suelto_ms: 0
  });

  useEffect(() => {
    // Enlace directo al broker público para el PoC
    const brokerUrl = 'wss://broker.hivemq.com:8884/mqtt';
    const topico = 'x7f9a/telemetria/volante/8f2c9b4e-1a3d-4c8f-9e2b-7d6a5c4b3a21'; 
    
    const client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
      setEstadoConexion('Conectado');
      client.subscribe(topico);
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        setDatosVolante({
          vehiculo_id: payload.vehiculo_id,
          manos_en_volante: payload.manos_en_volante,
          duracion_suelto_ms: payload.duracion_suelto_ms
        });
      } catch (error) {}
    });

    client.on('offline', () => setEstadoConexion('Desconectado'));

    return () => {
      client.end();
    };
  }, []);

  // Motor de decisión de la interfaz
  const esPeligro = !datosVolante.manos_en_volante && datosVolante.duracion_suelto_ms > 0;
  
  // Clases dinámicas basadas en el estado
  const colorAcento = esPeligro ? 'text-red-500' : 'text-emerald-500';
  const colorBorde = esPeligro ? 'border-red-500' : 'border-emerald-500';
  const textoEstado = esPeligro ? 'SUELTO' : 'ASEGURADO';
  const bgPulso = esPeligro ? 'bg-red-500/10' : 'bg-emerald-500/10';

  return (
    <div className="bg-[#060e20] min-h-screen w-full flex items-center justify-center p-4 sm:p-8 md:p-16 font-sans selection:bg-red-500/30">
      <main className="w-full max-w-6xl relative">
        
        {/* Resplandor Ambiental Dinámico */}
        <div className={`absolute inset-0 ${bgPulso} blur-[100px] pointer-events-none mix-blend-screen transition-colors duration-300`}></div>

        {/* Tarjeta Central Brutalista */}
        <article className={`relative z-10 bg-[#131b2e] rounded-none border-l-[8px] ${colorBorde} overflow-hidden shadow-2xl transition-colors duration-300`}>
          
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="p-12 md:p-24 flex flex-col gap-16 md:gap-24 relative z-10">
            
            {/* Cabecera: Identificación y Conexión */}
            <header className="flex items-center justify-between border-b border-slate-700/50 pb-6">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-none ${estadoConexion === 'Conectado' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <div className="font-mono text-slate-400 text-sm md:text-base uppercase tracking-[0.2em] font-medium">
                  Vehículo: {datosVolante.vehiculo_id}
                </div>
              </div>
              <div className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                Enlace: {estadoConexion}
              </div>
            </header>

            {/* Centro: Estado Primario */}
            <section className="flex flex-col gap-4 relative">
              {esPeligro && (
                <div className="font-mono text-red-500 text-xs uppercase tracking-widest opacity-80 flex items-center gap-2">
                  <span className="font-bold">⚠️ ALERTA DEL SISTEMA _ PRIORIDAD CRÍTICA</span>
                </div>
              )}
              <h1 className={`text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] leading-[0.85] font-black uppercase tracking-tighter ${colorAcento}`}>
                VOLANTE<br />{textoEstado}
              </h1>
            </section>

            {/* Fondo: Datos de Telemetría */}
            <footer className="bg-[#0b1326] border border-slate-700/50 p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${esPeligro ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
              
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Flujo de Diagnóstico</span>
                <span className="font-mono text-slate-600 text-[10px]">LOG_ID: #8892-A</span>
              </div>
              
              <div className={`font-mono text-3xl md:text-5xl font-bold tracking-tight ${colorAcento}`}>
                Tiempo suelto: {datosVolante.duracion_suelto_ms} ms
              </div>
            </footer>

          </div>
        </article>
      </main>
    </div>
  );
}