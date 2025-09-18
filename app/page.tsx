/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export default function PanelaDashboard() {
  const [temperature, setTemperature] = useState(25)
  const [setpoint, setSetpoint] = useState(115)
  const [rpm, setRpm] = useState(40)
  const [torque, setTorque] = useState(10)
  const [phase, setPhase] = useState("Clarificação")
  const [brix, setBrix] = useState(20)
  const [time, setTime] = useState(0)
  const [history, setHistory] = useState<any[]>([])

  // Simulação dos dados
  useEffect(() => {
    const interval = setInterval(() => {
      setTemperature((t) => Math.min(setpoint + 10, t + Math.random() * 2))
      setTorque((tor) => Math.min(100, tor + Math.random() * 2))
      setBrix((b) => Math.min(85, b + Math.random() * 1.5))
      setHistory((h) => [
        ...h,
        { time: new Date().toLocaleTimeString(), temp: temperature, torque, brix },
      ].slice(-20))
    }, 2000)
    return () => clearInterval(interval)
  }, [setpoint, temperature, torque])

  // Cronômetro de processo
  useEffect(() => {
    const timer = setInterval(() => setTime((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const phases = ["Clarificação", "Concentração", "Ponto"]
  const currentPhaseIndex = phases.indexOf(phase)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <Card className="shadow-xl">
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Status da Panela</h2>
          <p>Temperatura atual: <b>{temperature.toFixed(1)} °C</b></p>
          <p>Setpoint: <b>{setpoint} °C</b></p>
          <p>Velocidade da pá: <b>{rpm} rpm</b></p>
          <p>Torque do motor: <b>{torque.toFixed(1)} %</b></p>
          <p>Concentração de Açúcar: <b>{brix.toFixed(1)} °Brix</b></p>
          <p>Fase do processo: <b>{phase}</b></p>
          <p>Tempo de processo: <b>{Math.floor(time/60)} min {time%60}s</b></p>

          {temperature > setpoint && (
            <p className="text-red-600">⚠️ Temperatura acima do limite!</p>
          )}
          {torque > 90 && (
            <p className="text-orange-600">⚠️ Sobrecarga no motor!</p>
          )}

          <div className="mt-4 flex gap-2">
            <Button onClick={() => setPhase("Concentração")}>Iniciar Receita</Button>
            <Button variant="destructive" onClick={() => setPhase("Finalizado")}>Parar</Button>
          </div>

          <div className="mt-4">
            <Progress value={((currentPhaseIndex + 1) / phases.length) * 100} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Controles</h2>
          <p>Setpoint de Temperatura</p>
          <Slider min={80} max={130} value={[setpoint]} onValueChange={(v) => setSetpoint(v[0])} />
          <p className="mt-4">Velocidade da Pá</p>
          <Slider min={10} max={100} value={[rpm]} onValueChange={(v) => setRpm(v[0])} />
          <p className="mt-4">Torque Atual</p>
          <Progress value={torque} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2 shadow-xl">
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Histórico</h2>
          <LineChart width={600} height={250} data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="temp" stroke="#8884d8" name="Temperatura (°C)" />
            <Line type="monotone" dataKey="torque" stroke="#82ca9d" name="Torque (%)" />
            <Line type="monotone" dataKey="brix" stroke="#ff7300" name="Brix (°)" />
          </LineChart>
        </CardContent>
      </Card>
    </div>
  )
}