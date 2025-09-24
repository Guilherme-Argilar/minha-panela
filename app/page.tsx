/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts"
import { 
  Thermometer, 
  Gauge,  
  Droplet,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Settings,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  BarChart3,
  ShieldAlert
} from "lucide-react"

// ---------------- Configurações & Constantes ----------------
const AMBIENT = 25
const MAX_BRIX = 85
// Constantes ajustadas para meio termo ideal
const HEAT_K = 0.37  // Aquecimento no meio termo (era 0.35)
const COOL_K = 0.05  // Resfriamento rápido
const BRIX_K = 0.08  // Concentração rápida

const PHASE_CONFIG = {
  Clarificação: { 
    setpoint: 95, 
    color: "#3b82f6", 
    minBrix: 20, 
    maxBrix: 35,
    icon: "🧪",
    description: "Remoção de impurezas"
  },
  Concentração: { 
    setpoint: 115, 
    color: "#f59e0b", 
    minBrix: 35, 
    maxBrix: 75,
    icon: "🔥",
    description: "Evaporação da água"
  },
  Ponto: { 
    setpoint: 118, 
    color: "#ef4444", 
    minBrix: 75, 
    maxBrix: 85,
    icon: "💎",
    description: "Finalização do produto"
  },
  Finalizado: { 
    setpoint: 60, 
    color: "#10b981", 
    minBrix: 85, 
    maxBrix: 85,
    icon: "✅",
    description: "Resfriamento controlado"
  },
}

type ProcessPhase = keyof typeof PHASE_CONFIG
type AlarmType = { id: number; message: string; severity: "warning" | "error" | "info"; timestamp: Date }
type HistoryPoint = { time: string; temp: number; torque: number; brix: number; setpoint: number }

// ---------------- Componente de Indicador Radial ----------------
const RadialIndicator = ({ value, max, label, color, icon: Icon }: any) => {
  const data = [{ value, fill: color }]

  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width={100} height={100}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={data}>
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} fill={color} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className="w-4 h-4 opacity-60" />
        <span className="text-lg font-bold">{value.toFixed(0)}</span>
        <span className="text-xs opacity-60">{label}</span>
      </div>
    </div>
  )
}

// ---------------- Componente Principal ----------------
export default function ImprovedPanelaDashboard() {
  // Estados principais
  const [temperature, setTemperature] = useState(AMBIENT)
  const [setpoint, setSetpoint] = useState(95)
  const [rpm, setRpm] = useState(40)
  const [torque, setTorque] = useState(10)
  const [phase, setPhase] = useState<ProcessPhase>("Clarificação")
  const [brix, setBrix] = useState(20)
  const [time, setTime] = useState(0)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [auto, setAuto] = useState(false)
  const [running, setRunning] = useState(false)
  const [alarms, setAlarms] = useState<AlarmType[]>([])
  const [efficiency, setEfficiency] = useState(100)
  const [showChart, setShowChart] = useState(true)
  const [protectionActive, setProtectionActive] = useState(false)
  const [originalRpm, setOriginalRpm] = useState(40)
  
  // Estados da modal de proteção
  const [showProtectionModal, setShowProtectionModal] = useState(false)
  const [protectionClosed, setProtectionClosed] = useState(false)

  // Refs para laço estável
  const ref = useRef({ temperature, setpoint, rpm, torque, phase, brix, auto, running, protectionActive, originalRpm })
  useEffect(() => {
    ref.current = { temperature, setpoint, rpm, torque, phase, brix, auto, running, protectionActive, originalRpm }
  }, [temperature, setpoint, rpm, torque, phase, brix, auto, running, protectionActive, originalRpm])

  // Sistema de alarmes
  const addAlarm = useCallback((message: string, severity: "warning" | "error" | "info" = "warning") => {
    setAlarms(prev => [...prev.slice(-4), { 
      id: Date.now(), 
      message, 
      severity, 
      timestamp: new Date() 
    }])
  }, [])

  // Loop de simulação - ajustado para processo mais rápido
  useEffect(() => {
    const interval = setInterval(() => {
      const { temperature, setpoint, rpm, torque, phase, brix, auto, running, protectionActive, originalRpm } = ref.current
      
      if (!running) return

      // Física da temperatura (mais rápida)
      // Reduz aquecimento quando proteção ativa devido ao RPM reduzido
      const heatFactor = protectionActive ? HEAT_K * 0.8 : HEAT_K
      const toward = temperature + heatFactor * (setpoint - temperature)
      const cooled = toward - COOL_K * (temperature - AMBIENT)
      const nextTemp = Math.min(setpoint + 10, Math.max(AMBIENT, cooled))

      // Física do Brix (meio termo equilibrado)
      const evapFactor = Math.max(0, Math.min(2, (nextTemp - 80) / 50))
      const phaseFactor = phase === "Concentração" ? 1.8 : phase === "Ponto" ? 2.2 : 1.0
      const nextBrix = Math.min(MAX_BRIX, brix + BRIX_K * evapFactor * phaseFactor)

      // Física do torque
      const visc = Math.max(0, Math.min(1, (nextBrix - 20) / 60))
      const rpmFactor = rpm / 100
      let nextTorque = 5 + 50 * visc + 20 * rpmFactor + 40 * visc * rpmFactor
      if (phase === "Ponto") nextTorque += 5 * visc
      nextTorque = Math.min(100, Math.max(0, nextTorque))

      // PROTEÇÃO DO MOTOR - Redução automática de RPM
      let nextRpm = rpm
      let nextProtectionActive = protectionActive
      let nextOriginalRpm = originalRpm
      
      if (nextTorque >= 90 && !protectionActive) {
        // Ativa proteção e salva RPM original
        nextProtectionActive = true
        nextOriginalRpm = rpm
        nextRpm = Math.max(10, rpm * 0.7) // Reduz para 70% do RPM atual
        setRpm(nextRpm)
        setProtectionActive(true)
        setOriginalRpm(rpm)
        addAlarm("🛡️ PROTEÇÃO ATIVADA: Reduzindo RPM para evitar sobrecarga do motor!", "warning")
      } else if (protectionActive) {
        if (nextTorque >= 85) {
          // Continua reduzindo se ainda estiver alto
          nextRpm = Math.max(10, rpm - 2) // Reduz gradualmente
          setRpm(nextRpm)
        } else if (nextTorque < 75) {
          // Torque voltou ao normal, desativa proteção gradualmente
          if (rpm < originalRpm) {
            nextRpm = Math.min(originalRpm, rpm + 5) // Aumenta gradualmente
            setRpm(nextRpm)
            if (nextRpm >= originalRpm) {
              // Proteção completamente desativada
              nextProtectionActive = false
              setProtectionActive(false)
              addAlarm("✅ Proteção desativada: Torque normalizado", "info")
            }
          }
        }
        // Recalcula o torque com o novo RPM
        const newRpmFactor = nextRpm / 100
        nextTorque = 5 + 50 * visc + 20 * newRpmFactor + 40 * visc * newRpmFactor
        if (phase === "Ponto") nextTorque += 5 * visc
        nextTorque = Math.min(100, Math.max(0, nextTorque))
      }

      // Eficiência baseada nas condições
      const tempEfficiency = 100 - Math.abs(nextTemp - setpoint) * 0.5
      const torqueEfficiency = 100 - Math.max(0, nextTorque - 80) * 2
      setEfficiency(Math.min(100, Math.max(0, (tempEfficiency + torqueEfficiency) / 2)))

      // Transições automáticas (mais rápidas)
      let nextPhase: ProcessPhase = phase
      let nextSetpoint = setpoint
      
      if (auto) {
        // Meio termo: nem muito rápido, nem muito lento
        if (phase === "Clarificação" && (nextTemp >= 85 || nextBrix >= 26)) {
          nextPhase = "Concentração"
          nextSetpoint = PHASE_CONFIG[nextPhase].setpoint
          addAlarm("Iniciando fase de Concentração", "info")
        } else if (phase === "Concentração" && (nextBrix >= 55 || nextTorque >= 70)) {
          nextPhase = "Ponto"
          nextSetpoint = PHASE_CONFIG[nextPhase].setpoint
          addAlarm("Atingindo ponto ideal", "info")
        } else if (phase === "Ponto" && nextBrix >= 75) {
          nextPhase = "Finalizado"
          nextSetpoint = PHASE_CONFIG[nextPhase].setpoint
          addAlarm("Processo finalizado com sucesso!", "info")
        }
      }

      // Verificação de alarmes
      if (nextTemp > setpoint + 5 && temperature <= setpoint + 5) {
        addAlarm(`Temperatura excedendo limite: ${nextTemp.toFixed(1)}°C`, "warning")
      }
      if (nextTorque >= 85 && torque < 85 && !protectionActive) {
        addAlarm("⚠️ Torque elevado detectado no motor!", "warning")
      }
      if (nextTorque >= 95) {
        addAlarm("🚨 MOTOR EM SOBRECARGA CRÍTICA!", "error")
      }

      // Atualização de estado
      setTemperature(nextTemp)
      setBrix(nextBrix)
      setTorque(nextTorque)
      if (nextPhase !== phase) setPhase(nextPhase)
      if (nextSetpoint !== setpoint) setSetpoint(nextSetpoint)

      // Histórico com mais pontos para suavizar o gráfico
      setHistory(h => {
        const newPoint = {
          time: new Date().toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }),
          temp: +nextTemp.toFixed(1),
          torque: +nextTorque.toFixed(1),
          brix: +nextBrix.toFixed(1),
          setpoint: nextSetpoint
        }
        // Histórico ajustado para processo de ~40s (100 pontos = ~50 segundos)
        return [...h.slice(-99), newPoint]
      })
    }, 300) // Atualização mais frequente para transições rápidas (era 500ms)

    return () => clearInterval(interval)
  }, [addAlarm])

  // Cronômetro
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setTime(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [running])

  // Ações
  const handleStartClick = () => {
    // Se a proteção ainda não foi confirmada, mostra a modal
    if (!protectionClosed) {
      setShowProtectionModal(true)
      return
    }
    
    // Se já foi confirmada, inicia/pausa normalmente
    if (running) {
      handlePause()
    } else {
      handleStart()
    }
  }

  const handleStart = () => {
    setRunning(true)
    setAuto(true)
    setPhase("Clarificação")
    setSetpoint(PHASE_CONFIG["Clarificação"].setpoint)
    addAlarm("Sistema iniciado em modo automático", "info")
  }

  const handlePause = () => {
    setRunning(false)
    addAlarm("Sistema pausado", "warning")
  }

  const handleReset = () => {
    setRunning(false)
    setAuto(false)
    setPhase("Clarificação")
    setSetpoint(PHASE_CONFIG["Clarificação"].setpoint)
    setTemperature(AMBIENT)
    setBrix(20)
    setRpm(40)
    setTorque(10)
    setTime(0)
    setHistory([])
    setAlarms([])
    setEfficiency(100)
    setProtectionActive(false)
    setOriginalRpm(40)
    // Mantém o estado de proteção confirmada durante a sessão
  }

  const handleProtectionConfirm = () => {
    setProtectionClosed(true)
    setShowProtectionModal(false)
    addAlarm("⚠️ Verifique se as proteções estão fechadas antes de iniciar", "warning")
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const getStatusColor = () => {
    if (torque >= 90) return "text-red-500"
    if (protectionActive) return "text-orange-500"
    if (temperature > setpoint + 5) return "text-orange-500"
    if (!running) return "text-gray-500"
    return "text-green-500"
  }

  const currentConfig = PHASE_CONFIG[phase]

  // Dados do gráfico com suavização
  const chartData = useMemo(() => {
    return history.map((point, index) => ({
      ...point,
      index // Adiciona índice para suavizar transições
    }))
  }, [history])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        
        {/* Header */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">Sistema de Controle de Panela</div>
                <Badge variant={running ? "default" : "secondary"} className="text-sm sm:text-lg px-2 sm:px-3 py-1 self-start">
                  {running ? "OPERANDO" : "PARADO"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-lg sm:text-xl">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                {formatTime(time)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Proteção */}
        <Dialog open={showProtectionModal} onOpenChange={setShowProtectionModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <ShieldAlert className="w-5 h-5" />
                Aviso de Segurança
              </DialogTitle>
              <DialogDescription className="pt-3 space-y-3">
                <Alert className="border-orange-500 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700 font-medium">
                    ATENÇÃO: A proteção da panela está ABERTA!
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">Antes de iniciar o processo, verifique:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Tampa da panela está fechada e travada</li>
                    <li>Grades de proteção estão posicionadas</li>
                    <li>Válvulas de segurança estão operacionais</li>
                    <li>Área livre de pessoas</li>
                    <li>Sistema de exaustão está ligado</li>
                  </ul>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-700 text-sm">
                    Após verificar todos os itens, feche as proteções e clique novamente em &quot;Iniciar Processo&quot;.
                  </AlertDescription>
                </Alert>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                onClick={handleProtectionConfirm}
                className="w-full"
                variant="default"
              >
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alerta de Proteção Ativa */}
        {protectionActive && (
          <Alert className="border-orange-500 bg-orange-50">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 font-medium">
              🛡️ PROTEÇÃO DO MOTOR ATIVA: RPM reduzido automaticamente de {originalRpm} para {rpm} rpm para evitar sobrecarga (Torque: {torque.toFixed(0)}%)
            </AlertDescription>
          </Alert>
        )}

        {/* Indicadores principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Temperatura</p>
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{temperature.toFixed(1)}</span>
                    <span className="text-sm sm:text-base text-gray-500">°C</span>
                  </div>
                  <Progress value={(temperature / 130) * 100} className="mt-2" />
                </div>
                <Thermometer className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 ${getStatusColor()} ml-2`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Concentração</p>
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{brix.toFixed(1)}</span>
                    <span className="text-sm sm:text-base text-gray-500">°Brix</span>
                  </div>
                  <Progress value={(brix / MAX_BRIX) * 100} className="mt-2" />
                </div>
                <Droplet className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-500 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Torque Motor
                    {protectionActive && <span className="text-orange-500 text-xs ml-1">(Proteção Ativa)</span>}
                  </p>
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{torque.toFixed(0)}</span>
                    <span className="text-sm sm:text-base text-gray-500">%</span>
                  </div>
                  <Progress 
                    value={torque} 
                    className="mt-2"
                  />
                  {torque >= 75 && (
                    <p className="text-xs mt-1 text-orange-600">
                      {torque >= 90 ? '🛡️ Proteção ativada' : torque >= 85 ? '⚠️ Próximo ao limite' : 'Monitorando...'}
                    </p>
                  )}
                </div>
                <Gauge className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 ${torque >= 90 ? 'text-red-500' : torque >= 75 ? 'text-orange-500' : 'text-green-500'} ml-2`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-500">Eficiência</p>
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{efficiency.toFixed(0)}</span>
                    <span className="text-sm sm:text-base text-gray-500">%</span>
                  </div>
                  <Progress value={efficiency} className="mt-2" />
                </div>
                <Zap className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 ${efficiency >= 80 ? 'text-green-500' : efficiency >= 60 ? 'text-orange-500' : 'text-red-500'} ml-2`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status da Fase */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
              <h3 className="text-base sm:text-lg font-semibold">Fase do Processo</h3>
              <Badge style={{ backgroundColor: currentConfig.color }} className="text-white text-sm sm:text-base px-2 sm:px-3 py-1">
                {currentConfig.icon} {phase}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-xs sm:text-sm text-gray-500">{currentConfig.description}</p>
              <div className="flex gap-1 sm:gap-2">
                {Object.keys(PHASE_CONFIG).map((p) => (
                  <div
                    key={p}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      p === phase ? 'bg-blue-500' : 
                      Object.keys(PHASE_CONFIG).indexOf(p) < Object.keys(PHASE_CONFIG).indexOf(phase) ? 
                      'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Área principal */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
          <div className="xl:col-span-2 space-y-3 sm:space-y-4">
            
            {/* Seletor de Visualização */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant={showChart ? "default" : "outline"}
                onClick={() => setShowChart(true)}
                className="flex-1 text-sm sm:text-base"
              >
                <BarChart3 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Gráfico em Tempo Real
              </Button>
              <Button
                variant={!showChart ? "default" : "outline"}
                onClick={() => setShowChart(false)}
                className="flex-1 text-sm sm:text-base"
              >
                <Settings className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Controles Manuais
              </Button>
            </div>

            {/* Conteúdo dinâmico */}
            {showChart ? (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">Monitoramento em Tempo Real</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="sm:!h-80 lg:!h-96">
                    <LineChart 
                      data={chartData} 
                      margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }}
                        className="sm:text-xs"
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} className="sm:text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="temp" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Temperatura (°C)" 
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="setpoint" 
                        stroke="#ef4444" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Setpoint (°C)" 
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="brix" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Brix (°)" 
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="torque" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Torque (%)" 
                        dot={false}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                    Controles Manuais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs sm:text-sm font-medium">Setpoint de Temperatura</label>
                      <span className="text-xs sm:text-sm font-bold">{setpoint}°C</span>
                    </div>
                    <Slider 
                      min={60} 
                      max={130} 
                      step={1} 
                      value={[setpoint]} 
                      onValueChange={(v) => !auto && setSetpoint(v[0])}
                      disabled={auto}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs sm:text-sm font-medium">
                        Velocidade da Pá (RPM)
                        {protectionActive && <span className="text-orange-500 ml-1">🛡️ PROTEÇÃO</span>}
                      </label>
                      <span className="text-xs sm:text-sm font-bold">
                        {rpm} rpm
                        {protectionActive && <span className="text-orange-500 text-xs ml-1">(Auto-reduzido de {originalRpm})</span>}
                      </span>
                    </div>
                    <Slider 
                      min={10} 
                      max={100} 
                      step={5} 
                      value={[rpm]} 
                      onValueChange={(v) => {
                        if (!protectionActive) {
                          setRpm(v[0])
                          setOriginalRpm(v[0]) // Salva como RPM original para futuras proteções
                        }
                      }}
                      disabled={protectionActive}
                      className={protectionActive ? "opacity-60" : ""}
                    />
                    {protectionActive && (
                      <Alert className="border-orange-200 bg-orange-50 mt-2">
                        <AlertDescription className="text-xs text-orange-700">
                          <strong>Proteção Automática:</strong> RPM reduzido para proteger o motor contra sobrecarga. 
                          O sistema voltará ao RPM original ({originalRpm} rpm) quando o torque normalizar abaixo de 75%.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <span className="text-xs sm:text-sm">Modo Automático</span>
                    <Button
                      size="sm"
                      variant={auto ? "default" : "outline"}
                      onClick={() => setAuto(!auto)}
                      className="text-xs sm:text-sm"
                    >
                      {auto ? "ATIVADO" : "DESATIVADO"}
                    </Button>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <AlertDescription className="text-xs sm:text-sm">
                      {auto ? 
                        "Sistema operando em modo automático. Os setpoints seguem a receita programada." :
                        "Modo manual ativo. Ajuste os parâmetros conforme necessário."
                      }
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Temperatura Alvo</p>
                      <p className="text-sm sm:text-lg font-bold">{setpoint}°C</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Diferencial</p>
                      <p className="text-sm sm:text-lg font-bold">{(temperature - setpoint).toFixed(1)}°C</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Taxa Evaporação</p>
                      <p className="text-sm sm:text-lg font-bold">{((temperature - 80) / 50 * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Viscosidade</p>
                      <p className="text-sm sm:text-lg font-bold">{((brix - 20) / 60 * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Indicadores Radiais */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Indicadores Rápidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 place-items-center">
                  <div className="flex flex-col items-center">
                    <RadialIndicator 
                      value={temperature}
                      max={130}
                      label="°C"
                      color="#ef4444"
                      icon={Thermometer}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <RadialIndicator 
                      value={brix}
                      max={MAX_BRIX}
                      label="°Brix"
                      color="#3b82f6"
                      icon={Droplet}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <RadialIndicator 
                      value={torque}
                      max={100}
                      label="%"
                      color="#10b981"
                      icon={Gauge}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <RadialIndicator 
                      value={efficiency}
                      max={100}
                      label="Efic."
                      color="#f59e0b"
                      icon={TrendingUp}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Controles de Ação */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Controles do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <Button 
                  className="w-full text-sm sm:text-base" 
                  size="lg"
                  onClick={handleStartClick}
                  variant={running ? "destructive" : "default"}
                >
                  {running ? (
                    <>
                      <Pause className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Pausar Processo
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Iniciar Processo
                    </>
                  )}
                </Button>
                <Button 
                  className="w-full text-sm sm:text-base" 
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Reiniciar Sistema
                </Button>
              </CardContent>
            </Card>

            {/* Alarmes */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                  <span>Alarmes e Eventos</span>
                  {alarms.length > 0 && (
                    <Badge variant="destructive" className="text-xs sm:text-sm">{alarms.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                  {alarms.length === 0 ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
                      Nenhum alarme ativo
                    </p>
                  ) : (
                    alarms.slice(-5).reverse().map((alarm) => (
                      <div 
                        key={alarm.id} 
                        className={`p-2 rounded-lg text-xs sm:text-sm ${
                          alarm.severity === 'error' ? 'bg-red-50 text-red-700' :
                          alarm.severity === 'warning' ? 'bg-orange-50 text-orange-700' :
                          'bg-blue-50 text-blue-700'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {alarm.severity === 'error' ? 
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" /> :
                            alarm.severity === 'warning' ?
                            <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" /> :
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="font-medium break-words">{alarm.message}</p>
                            <p className="text-xs opacity-70">
                              {alarm.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações do Sistema */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Informações do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Modo de Operação</span>
                  <Badge variant={auto ? "default" : "outline"} className="text-xs">
                    {auto ? "AUTOMÁTICO" : "MANUAL"}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Status do Motor</span>
                  <span className={`font-bold ${torque >= 90 ? 'text-red-500' : torque >= 75 ? 'text-orange-500' : 'text-green-500'}`}>
                    {torque >= 90 ? '⚠️ PROTEÇÃO' : torque >= 85 ? 'ALTO TORQUE' : torque >= 75 ? 'ELEVADO' : 'NORMAL'}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Proteção do Motor</span>
                  <div className="flex items-center gap-1">
                    <span className={`font-bold ${protectionActive ? 'text-orange-500' : 'text-green-500'}`}>
                      {protectionActive ? 'ATIVA' : 'NORMAL'}
                    </span>
                    {protectionActive && <span className="text-xs">🛡️</span>}
                  </div>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Velocidade da Pá</span>
                  <span className={`font-bold ${protectionActive ? 'text-orange-500' : 'text-blue-600'}`}>
                    {rpm} rpm {protectionActive && <span className="text-xs">(Reduzido)</span>}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Tempo Total</span>
                  <span className="font-bold">{formatTime(time)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Eficiência Geral</span>
                  <span className={`font-bold ${efficiency >= 80 ? 'text-green-600' : efficiency >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                    {efficiency.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Processo Estimado</span>
                  <span className="font-bold text-blue-600">
                    {protectionActive ? '~50 segundos' : '~40 segundos'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}