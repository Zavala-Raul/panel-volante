"use client";

import { useEffect, useState } from 'react';
import mqtt from 'mqtt';

const FLOTA_MOCK = [
  { id: 'TRK-001', estado: 'En Ruta', conductor: 'Juan Pérez', incidentes: 2, eficiencia: 98 },
  { id: 'TRK-002', estado: 'En Ruta', conductor: 'María López', incidentes: 0, eficiencia: 100 },
  { id: 'TRK-005', estado: 'Mantenimiento', conductor: 'N/A', incidentes: 5, eficiencia: 85 },
];

export default function TelemetriaDashboard() {
  const [estadoConexion, setEstadoConexion] = useState('Desconectado');
  const [eventos, setEventos] = useState<string[]>([]);
  const [vistaActiva, setVistaActiva] = useState<'monitor' | 'reportes' | 'ajustes'>('monitor');
  
  const [vehiculoReal, setVehiculoReal] = useState({
    vehiculo_id: 'TRK-007 (PROTOTIPO)',
    manos_en_volante: true,
    duracion_suelto_ms: 0
  });

  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('TRK-007 (PROTOTIPO)');

  useEffect(() => {
    const agregarEvento = (mensaje: string) => {
      const hora = new Date().toLocaleTimeString();
      setEventos(prev => [`[${hora}] ${mensaje}`, ...prev].slice(0, 15)); 
    };

    const brokerUrl = 'wss://broker.hivemq.com:8884/mqtt';
    const topico = 'x7f9a/telemetria/volante/8f2c9b4e-1a3d-4c8f-9e2b-7d6a5c4b3a21'; 
    
    const client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
      setEstadoConexion('Conectado');
      client.subscribe(topico);
      agregarEvento('Sistema conectado al Broker MQTT.');
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        
        if (!payload.manos_en_volante && vehiculoReal.manos_en_volante) {
            agregarEvento(`¡ALERTA CRÍTICA! ${payload.vehiculo_id} soltó el volante.`);
        } else if (payload.manos_en_volante && !vehiculoReal.manos_en_volante) {
            agregarEvento(`INFO: ${payload.vehiculo_id} retomó el control.`);
        }

        setVehiculoReal({
          vehiculo_id: payload.vehiculo_id || 'TRK-007 (PROTOTIPO)',
          manos_en_volante: payload.manos_en_volante,
          duracion_suelto_ms: payload.duracion_suelto_ms
        });
      } catch (error) {
        console.error("Error parseando MQTT", error);
      }
    });

    client.on('offline', () => {
        setEstadoConexion('Desconectado');
        agregarEvento('Conexión perdida con el Broker.');
    });

    return () => {
      client.end();
    };
  }, [vehiculoReal.manos_en_volante]);

  const esPeligro = !vehiculoReal.manos_en_volante && vehiculoReal.duracion_suelto_ms > 0;
  const vehiculoMockActual = FLOTA_MOCK.find(v => v.id === vehiculoSeleccionado);

  return (
    <div className="bg-[#060e20] min-h-screen w-full flex font-sans text-slate-200 selection:bg-emerald-500/30">
      
      {/* SIDEBAR DE CONTROL */}
      <aside className="w-64 bg-[#0b1326] border-r border-slate-700/50 p-6 hidden md:flex md:flex-col gap-6 z-20">
        <div>
            <h2 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-4">Flota Activa</h2>
            <div className="flex flex-col gap-2">
                <button 
                    onClick={() => { setVistaActiva('monitor'); setVehiculoSeleccionado(vehiculoReal.vehiculo_id); }}
                    className={`text-left p-3 rounded border transition-colors ${vehiculoSeleccionado === vehiculoReal.vehiculo_id && vistaActiva === 'monitor' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700/50 hover:bg-slate-800'}`}
                >
                    <div className="font-mono text-sm font-bold flex items-center justify-between">
                        {vehiculoReal.vehiculo_id}
                        <span className={`w-2 h-2 rounded-full ${estadoConexion === 'Conectado' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Conductor: Piloto Pruebas</div>
                </button>

                {FLOTA_MOCK.map(v => (
                    <button 
                        key={v.id}
                        onClick={() => { setVistaActiva('monitor'); setVehiculoSeleccionado(v.id); }}
                        className={`text-left p-3 rounded border transition-colors ${vehiculoSeleccionado === v.id && vistaActiva === 'monitor' ? 'border-slate-400 bg-slate-800' : 'border-slate-700/50 hover:bg-slate-800/50'}`}
                    >
                        <div className="font-mono text-sm font-bold">{v.id}</div>
                        <div className="text-xs text-slate-500 mt-1">Estado: {v.estado}</div>
                    </button>
                ))}
            </div>
        </div>

        <div className="mt-auto">
            <h2 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-4">Módulos (Análisis)</h2>
            <div className="flex flex-col gap-2 text-sm text-slate-400 font-mono">
                <button onClick={() => setVistaActiva('reportes')} className={`text-left p-2 rounded transition-colors ${vistaActiva === 'reportes' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-slate-800 hover:text-white'}`}>
                    📊 Reportes Globales
                </button>
                <button onClick={() => setVistaActiva('ajustes')} className={`text-left p-2 rounded transition-colors ${vistaActiva === 'ajustes' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-slate-800 hover:text-white'}`}>
                    ⚙️ Ajustes de Sistema
                </button>
            </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 relative overflow-hidden">
        <div className={`absolute inset-0 ${esPeligro && vehiculoSeleccionado === vehiculoReal.vehiculo_id && vistaActiva === 'monitor' ? 'bg-red-500/10' : 'bg-transparent'} blur-[100px] pointer-events-none transition-colors duration-300`}></div>

        <header className="flex items-center justify-between border-b border-slate-700/50 pb-4 mb-8 z-10">
            <h1 className="font-mono text-xl uppercase tracking-widest font-bold">
                {vistaActiva === 'monitor' ? 'Telemetría Sensorial' : vistaActiva === 'reportes' ? 'Inteligencia de Flota' : 'Configuración de Sistema'}
            </h1>
            <div className="font-mono text-xs text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1 rounded border border-slate-700">
                MQTT: {estadoConexion}
            </div>
        </header>

        {/* ENRUTADOR INTERNO (MÁQUINA DE ESTADOS) */}
        {vistaActiva === 'monitor' && vehiculoSeleccionado === vehiculoReal.vehiculo_id && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 flex-1">
                <div className="lg:col-span-2 flex flex-col justify-center">
                    <article className={`bg-[#131b2e] border-l-[8px] ${esPeligro ? 'border-red-500' : 'border-emerald-500'} p-8 md:p-16 shadow-2xl transition-colors duration-300 relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-9xl">007</div>
                        <div className="flex flex-col gap-4 relative z-10">
                            {esPeligro && (
                                <div className="font-mono text-red-500 text-sm uppercase tracking-widest font-bold animate-pulse">
                                ⚠️ ALERTA: CONDUCTOR DISTRAÍDO
                                </div>
                            )}
                            <h2 className={`text-[3rem] sm:text-[4rem] md:text-[6rem] leading-[0.85] font-black uppercase tracking-tighter ${esPeligro ? 'text-red-500' : 'text-emerald-500'}`}>
                                {esPeligro ? 'VOLANTE SUELTO' : 'MANOS AL VOLANTE'}
                            </h2>
                            <div className="mt-8 font-mono text-2xl md:text-3xl text-slate-400">
                                Tiempo crítico: <span className={`font-bold ${esPeligro ? 'text-red-400' : 'text-slate-100'}`}>{vehiculoReal.duracion_suelto_ms} ms</span>
                            </div>
                        </div>
                    </article>
                </div>

                <div className="bg-[#0b1326] border border-slate-700/50 p-6 flex flex-col h-[500px] lg:h-auto shadow-xl">
                    <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-4 border-b border-slate-700/50 pb-2">Registro de Eventos (Memoria)</h3>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-2 font-mono text-xs pr-2">
                        {eventos.length === 0 && <span className="text-slate-600">Esperando capa capacitiva ESP32...</span>}
                        {eventos.map((ev, i) => (
                            <div key={i} className={`${ev.includes('ALERTA') ? 'text-red-400 border-l-2 border-red-500 pl-2 bg-red-500/10' : 'text-emerald-400 border-l-2 border-emerald-500 pl-2 bg-emerald-500/10'} py-2 pr-2`}>
                                {ev}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {vistaActiva === 'monitor' && vehiculoSeleccionado !== vehiculoReal.vehiculo_id && vehiculoMockActual && (
            <div className="flex-1 flex flex-col z-10 gap-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#131b2e] border-l-[4px] border-slate-500 p-6 shadow-xl">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Unidad</div>
                        <div className="text-3xl font-mono font-bold">{vehiculoMockActual.id}</div>
                        <div className="mt-4 text-sm text-slate-400">Conductor: <span className="text-white">{vehiculoMockActual.conductor}</span></div>
                    </div>
                    <div className="bg-[#131b2e] border-l-[4px] border-slate-500 p-6 shadow-xl">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Estado Lógico</div>
                        <div className="text-3xl font-mono font-bold text-emerald-400">NORMAL</div>
                        <div className="mt-4 text-sm text-slate-400">Último ping: Hace 2 minutos</div>
                    </div>
                    <div className="bg-[#131b2e] border-l-[4px] border-slate-500 p-6 shadow-xl">
                        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Tasa de Sujeción (Última hora)</div>
                        <div className="text-3xl font-mono font-bold text-blue-400">{vehiculoMockActual.eficiencia}%</div>
                        <div className="mt-4 w-full bg-slate-800 h-2 rounded overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${vehiculoMockActual.eficiencia}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 bg-[#0b1326] border border-slate-700/50 p-8 flex items-center justify-center">
                    <div className="text-center font-mono text-slate-500">
                        <span className="text-4xl block mb-4">📡</span>
                        Transmisión de telemetría en vivo pausada para ahorrar ancho de banda.<br/>Seleccione el prototipo para auditoría en tiempo real.
                    </div>
                </div>
            </div>
        )}

        {vistaActiva === 'reportes' && (
            <div className="flex-1 z-10 flex flex-col gap-8 overflow-y-auto pr-4">
                <div className="bg-[#131b2e] p-8 border border-slate-700/50 shadow-xl">
                    <h2 className="text-lg font-bold mb-6 font-mono text-slate-300">Índice de Concentración por Conductor (Mensual)</h2>
                    <div className="flex flex-col gap-6">
                        {FLOTA_MOCK.map(v => (
                            <div key={v.id}>
                                <div className="flex justify-between text-sm font-mono mb-2">
                                    <span>{v.id} - {v.conductor}</span>
                                    <span className={v.eficiencia < 90 ? 'text-red-400' : 'text-emerald-400'}>{v.eficiencia}%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-6 rounded-sm overflow-hidden relative">
                                    <div className={`h-full ${v.eficiencia < 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${v.eficiencia}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#131b2e] p-8 border border-slate-700/50 shadow-xl">
                        <h2 className="text-lg font-bold mb-4 font-mono text-slate-300">Total de Alertas Críticas</h2>
                        <div className="text-6xl font-black text-red-500 font-mono">7</div>
                        <p className="text-sm text-slate-500 mt-2">Acumulado en toda la flota durante los últimos 30 días.</p>
                    </div>
                    <div className="bg-[#131b2e] p-8 border border-slate-700/50 shadow-xl">
                        <h2 className="text-lg font-bold mb-4 font-mono text-slate-300">Ahorro Estimado</h2>
                        <div className="text-6xl font-black text-emerald-500 font-mono">$12,400</div>
                        <p className="text-sm text-slate-500 mt-2">En prevención de accidentes y multas de aseguradoras.</p>
                    </div>
                </div>
            </div>
        )}

        {vistaActiva === 'ajustes' && (
            <div className="flex-1 z-10">
                <div className="max-w-2xl bg-[#131b2e] p-8 border border-slate-700/50 shadow-xl">
                    <h2 className="text-lg font-bold mb-8 font-mono text-slate-300 border-b border-slate-700/50 pb-4">Parámetros del Sistema (Global)</h2>
                    
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">Tolerancia de desapego (ms)</div>
                                <div className="text-sm text-slate-500">Tiempo máximo permitido sin contacto en el volante antes de emitir alerta.</div>
                            </div>
                            <input type="text" disabled value="1500" className="bg-slate-800 border border-slate-600 rounded px-4 py-2 w-24 text-center font-mono text-emerald-400" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">Alertas Sonoras (Buzzer)</div>
                                <div className="text-sm text-slate-500">Activa la advertencia acústica local en cabina.</div>
                            </div>
                            <div className="w-12 h-6 bg-emerald-500 rounded-full relative opacity-50 cursor-not-allowed">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">Envío a la Nube (AWS/GCP)</div>
                                <div className="text-sm text-slate-500">Sincronización de base de datos histórica.</div>
                            </div>
                            <div className="w-12 h-6 bg-slate-700 rounded-full relative opacity-50 cursor-not-allowed">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full"></div>
                            </div>
                        </div>
                        
                        <div className="mt-4 text-xs text-red-400 bg-red-500/10 p-4 border border-red-500/20 rounded">
                            Nota: Los privilegios de edición están deshabilitados en la vista de demostración.
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}