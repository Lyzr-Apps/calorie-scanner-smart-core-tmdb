'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FiCamera, FiActivity, FiTrendingUp, FiUser, FiSend, FiCheck, FiAlertTriangle, FiInfo, FiTarget, FiClock, FiChevronLeft, FiChevronRight, FiX, FiHeart, FiImage, FiCopy, FiDroplet, FiAward, FiMinus, FiPlus } from 'react-icons/fi'
import { MdOutlineLocalDining, MdOutlineDirectionsWalk, MdRestaurant } from 'react-icons/md'
import { HiOutlineSparkles, HiOutlineLightBulb, HiOutlineChartBar } from 'react-icons/hi'
import { RiLeafLine, RiFireLine } from 'react-icons/ri'

// ──────── Constants ────────
const FOOD_AGENT_ID = '6999630a730bbd74d53e8abf'
const COACH_AGENT_ID = '6999630b0fc64800c899bb91'

const LS_MEALS = 'nutrisnap_meals'
const LS_GOALS = 'nutrisnap_goals'
const LS_STEPS = 'nutrisnap_steps'
const LS_WATER = 'nutrisnap_water'
const LS_PROFILE = 'nutrisnap_profile'

// ──────── Types ────────
interface FoodItem {
  name: string
  portion_size: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
}

interface FoodAnalysis {
  food_items: FoodItem[]
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  total_fiber_g: number
  total_sugar_g: number
  total_sodium_mg: number
  meal_category: string
  summary: string
}

interface MealEntry {
  id: string
  date: string
  time: string
  photoUrl: string
  analysis: FoodAnalysis
  category: string
}

interface CaloricBalance {
  consumed: number
  burned: number
  net: number
  daily_goal: number
  remaining: number
}

interface Insight {
  type: string
  icon: string
  message: string
}

interface CoachResponse {
  overall_status: string
  caloric_balance: CaloricBalance
  insights: Insight[]
  suggestions: string[]
  motivational_message: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  data?: CoachResponse | null
  timestamp: string
}

interface Goals {
  calorieTarget: number
  proteinPct: number
  carbsPct: number
  fatPct: number
  stepGoal: number
  waterGoal: number
}

const DEFAULT_GOALS: Goals = {
  calorieTarget: 2000,
  proteinPct: 30,
  carbsPct: 40,
  fatPct: 30,
  stepGoal: 10000,
  waterGoal: 8,
}

// ──────── Sample Data ────────
const SAMPLE_DATE_PLACEHOLDER = '@@TODAY@@'
function getSampleMeals(today: string): MealEntry[] {
  return SAMPLE_MEALS_TEMPLATE.map(m => ({ ...m, date: today || m.date }))
}
const SAMPLE_MEALS_TEMPLATE: MealEntry[] = [
  {
    id: 'sample-1',
    date: SAMPLE_DATE_PLACEHOLDER,
    time: '08:15',
    photoUrl: '',
    category: 'breakfast',
    analysis: {
      food_items: [
        { name: 'Scrambled Eggs', portion_size: '2 large', calories: 182, protein_g: 12, carbs_g: 2, fat_g: 14, fiber_g: 0, sugar_g: 1, sodium_mg: 320 },
        { name: 'Whole Wheat Toast', portion_size: '2 slices', calories: 138, protein_g: 6, carbs_g: 24, fat_g: 2, fiber_g: 4, sugar_g: 3, sodium_mg: 264 },
        { name: 'Avocado', portion_size: '1/2 medium', calories: 120, protein_g: 1.5, carbs_g: 6, fat_g: 11, fiber_g: 5, sugar_g: 0.5, sodium_mg: 5 },
      ],
      total_calories: 440,
      total_protein_g: 19.5,
      total_carbs_g: 32,
      total_fat_g: 27,
      total_fiber_g: 9,
      total_sugar_g: 4.5,
      total_sodium_mg: 589,
      meal_category: 'breakfast',
      summary: 'A balanced breakfast with eggs, whole wheat toast, and avocado providing good protein and healthy fats.',
    },
  },
  {
    id: 'sample-2',
    date: SAMPLE_DATE_PLACEHOLDER,
    time: '12:30',
    photoUrl: '',
    category: 'lunch',
    analysis: {
      food_items: [
        { name: 'Grilled Chicken Breast', portion_size: '6 oz', calories: 284, protein_g: 53, carbs_g: 0, fat_g: 6, fiber_g: 0, sugar_g: 0, sodium_mg: 130 },
        { name: 'Caesar Salad', portion_size: '2 cups', calories: 180, protein_g: 4, carbs_g: 8, fat_g: 15, fiber_g: 2, sugar_g: 2, sodium_mg: 410 },
        { name: 'Brown Rice', portion_size: '1 cup', calories: 216, protein_g: 5, carbs_g: 45, fat_g: 2, fiber_g: 3.5, sugar_g: 0.7, sodium_mg: 10 },
      ],
      total_calories: 680,
      total_protein_g: 62,
      total_carbs_g: 53,
      total_fat_g: 23,
      total_fiber_g: 5.5,
      total_sugar_g: 2.7,
      total_sodium_mg: 550,
      meal_category: 'lunch',
      summary: 'A protein-rich lunch with grilled chicken, caesar salad, and brown rice. Great post-workout meal.',
    },
  },
  {
    id: 'sample-3',
    date: SAMPLE_DATE_PLACEHOLDER,
    time: '16:00',
    photoUrl: '',
    category: 'snack',
    analysis: {
      food_items: [
        { name: 'Greek Yogurt', portion_size: '1 cup', calories: 130, protein_g: 15, carbs_g: 8, fat_g: 4, fiber_g: 0, sugar_g: 7, sodium_mg: 65 },
        { name: 'Mixed Berries', portion_size: '1/2 cup', calories: 40, protein_g: 0.5, carbs_g: 10, fat_g: 0, fiber_g: 2, sugar_g: 7, sodium_mg: 1 },
      ],
      total_calories: 170,
      total_protein_g: 15.5,
      total_carbs_g: 18,
      total_fat_g: 4,
      total_fiber_g: 2,
      total_sugar_g: 14,
      total_sodium_mg: 66,
      meal_category: 'snack',
      summary: 'A light and nutritious snack with greek yogurt and berries, providing protein and antioxidants.',
    },
  },
]

// ──────── Helpers ────────
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function getCategoryColor(cat: string): string {
  switch (cat?.toLowerCase()) {
    case 'breakfast': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'lunch': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'dinner': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    case 'snack': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

function getCategoryIcon(cat: string) {
  switch (cat?.toLowerCase()) {
    case 'breakfast': return <RiLeafLine className="w-3.5 h-3.5" />
    case 'lunch': return <MdRestaurant className="w-3.5 h-3.5" />
    case 'dinner': return <MdOutlineLocalDining className="w-3.5 h-3.5" />
    case 'snack': return <HiOutlineSparkles className="w-3.5 h-3.5" />
    default: return <MdRestaurant className="w-3.5 h-3.5" />
  }
}

function getInsightStyle(type: string) {
  switch (type) {
    case 'positive': return { bg: 'bg-emerald-500/10 border-emerald-500/30', icon: <FiCheck className="w-4 h-4 text-emerald-400" />, text: 'text-emerald-300' }
    case 'warning': return { bg: 'bg-amber-500/10 border-amber-500/30', icon: <FiAlertTriangle className="w-4 h-4 text-amber-400" />, text: 'text-amber-300' }
    case 'suggestion': return { bg: 'bg-blue-500/10 border-blue-500/30', icon: <HiOutlineLightBulb className="w-4 h-4 text-blue-400" />, text: 'text-blue-300' }
    default: return { bg: 'bg-muted border-border', icon: <FiInfo className="w-4 h-4 text-muted-foreground" />, text: 'text-muted-foreground' }
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

// ──────── SVG Progress Ring ────────
function ProgressRing({ value, max, size = 56, strokeWidth = 5, color = 'hsl(160, 70%, 40%)' }: { value: number; max: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value / (max || 1), 0), 1)
  const offset = circumference * (1 - pct)
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(160, 22%, 15%)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
    </svg>
  )
}

// ──────── Macro Bar ────────
function MacroBar({ label, value, max, color, unit = 'g' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}{unit} / {Math.round(max)}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ──────── Metric Tile ────────
function MetricTile({ icon, label, value, target, unit, color }: { icon: React.ReactNode; label: string; value: number; target: number; unit: string; color: string }) {
  return (
    <Card className="bg-card border border-border shadow-md relative overflow-hidden">
      <CardContent className="p-3 flex flex-col items-center gap-1.5">
        <div className="relative">
          <ProgressRing value={value} max={target} size={52} strokeWidth={4} color={color} />
          <div className="absolute inset-0 flex items-center justify-center">{icon}</div>
        </div>
        <span className="text-lg font-bold tracking-tight">{Math.round(value).toLocaleString()}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </CardContent>
    </Card>
  )
}

// ──────── Meal Card ────────
function MealCard({ meal, onDelete }: { meal: MealEntry; onDelete: (id: string) => void }) {
  const items = Array.isArray(meal.analysis?.food_items) ? meal.analysis.food_items : []
  const catColor = getCategoryColor(meal.category)
  return (
    <Card className="bg-card border border-border shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {meal.photoUrl ? (
              <img src={meal.photoUrl} alt="Meal" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <MdRestaurant className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${catColor}`}>
                  {getCategoryIcon(meal.category)}
                  <span className="ml-1 capitalize">{meal.category || 'meal'}</span>
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><FiClock className="w-3 h-3" />{meal.time}</span>
              </div>
              <button onClick={() => onDelete(meal.id)} className="p-1 rounded-md hover:bg-destructive/20 transition-colors">
                <FiX className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            <p className="text-sm font-medium truncate">{items.map(i => i.name).join(', ') || 'Meal logged'}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><RiFireLine className="w-3.5 h-3.5 text-orange-400" /><span className="font-semibold text-foreground">{meal.analysis?.total_calories ?? 0}</span> cal</span>
              <span>P: {Math.round(meal.analysis?.total_protein_g ?? 0)}g</span>
              <span>C: {Math.round(meal.analysis?.total_carbs_g ?? 0)}g</span>
              <span>F: {Math.round(meal.analysis?.total_fat_g ?? 0)}g</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ──────── Water Tracker ────────
function WaterTracker({ glasses, goal, onAdd, onRemove }: { glasses: number; goal: number; onAdd: () => void; onRemove: () => void }) {
  const filled = Math.min(glasses, goal)
  return (
    <Card className="bg-card border border-border shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiDroplet className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Hydration</span>
          </div>
          <span className="text-xs text-muted-foreground">{glasses} / {goal} glasses</span>
        </div>
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {Array.from({ length: goal }).map((_, i) => (
            <div key={i} className={`w-6 h-8 rounded-md border transition-all duration-300 flex items-center justify-center ${i < filled ? 'bg-blue-500/30 border-blue-500/50' : 'bg-muted/30 border-border'}`}>
              <FiDroplet className={`w-3 h-3 transition-all duration-300 ${i < filled ? 'text-blue-400' : 'text-muted-foreground/30'}`} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onRemove} variant="outline" size="sm" disabled={glasses <= 0} className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-foreground">
            <FiMinus className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={onAdd} variant="outline" size="sm" className="flex-1 h-8 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-medium text-xs">
            <FiPlus className="w-3 h-3 mr-1" /> Add Glass (250ml)
          </Button>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-8 px-2 text-[10px] text-muted-foreground hover:text-foreground" disabled={glasses <= 0}>
            Undo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ──────── Weekly Trend Chart ────────
function WeeklyTrendChart({ mealsByDate, calorieTarget, todayStr }: { mealsByDate: Record<string, MealEntry[]>; calorieTarget: number; todayStr: string }) {
  const [days, setDays] = useState<{ label: string; date: string; calories: number }[]>([])
  useEffect(() => {
    if (!todayStr) return
    const result: { label: string; date: string; calories: number }[] = []
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayMeals = mealsByDate[dateStr] ?? []
      const cals = dayMeals.reduce((sum, m) => sum + (m.analysis?.total_calories ?? 0), 0)
      result.push({ label: dayLabels[d.getDay()], date: dateStr, calories: cals })
    }
    setDays(result)
  }, [mealsByDate, todayStr])

  if (days.length === 0) return null
  const maxVal = Math.max(calorieTarget, ...days.map(d => d.calories), 100)

  return (
    <Card className="bg-card border border-border shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiTrendingUp className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">Weekly Trend</span>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {days.map((day, i) => {
            const height = maxVal > 0 ? (day.calories / maxVal) * 100 : 0
            const isToday = day.date === todayStr
            const overGoal = day.calories > calorieTarget
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground font-medium">{day.calories > 0 ? day.calories : ''}</span>
                <div className="w-full flex-1 relative flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ease-out ${overGoal ? 'bg-red-500/60' : isToday ? 'bg-accent' : 'bg-accent/40'}`}
                    style={{ height: `${Math.max(height, day.calories > 0 ? 8 : 2)}%`, minHeight: day.calories > 0 ? '4px' : '2px' }}
                  />
                </div>
                <span className={`text-[9px] font-medium ${isToday ? 'text-accent' : 'text-muted-foreground'}`}>{day.label}</span>
              </div>
            )
          })}
        </div>
        {/* Goal line label */}
        <div className="flex items-center gap-2 mt-2">
          <div className="h-px flex-1 bg-accent/30 border-t border-dashed border-accent/40" />
          <span className="text-[9px] text-muted-foreground">Goal: {calorieTarget} cal</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ──────── Streak Counter ────────
function StreakBadge({ mealsByDate, todayStr }: { mealsByDate: Record<string, MealEntry[]>; todayStr: string }) {
  const [streak, setStreak] = useState(0)
  useEffect(() => {
    if (!todayStr) return
    let count = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const hasMeals = Array.isArray(mealsByDate[dateStr]) && mealsByDate[dateStr].length > 0
      if (hasMeals) {
        count++
        d.setDate(d.getDate() - 1)
      } else if (i === 0) {
        // Today might not have meals yet; check yesterday
        d.setDate(d.getDate() - 1)
        continue
      } else {
        break
      }
    }
    setStreak(count)
  }, [mealsByDate, todayStr])

  if (streak <= 0) return null
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
      <FiAward className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-xs font-semibold text-amber-400">{streak} day streak</span>
    </div>
  )
}

// ──────── Calendar Grid ────────
function CalendarGrid({ selectedDate, onSelect, mealsByDate, calorieTarget }: { selectedDate: string; onSelect: (d: string) => void; mealsByDate: Record<string, MealEntry[]>; calorieTarget: number }) {
  const [viewDate, setViewDate] = useState<Date | null>(null)
  const [todayCalStr, setTodayCalStr] = useState('')
  useEffect(() => {
    const now = new Date()
    setViewDate(now)
    setTodayCalStr(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
  }, [])
  if (!viewDate) return <div className="h-64 flex items-center justify-center"><Skeleton className="w-full h-48" /></div>
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const getDayColor = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const meals = mealsByDate[dateStr]
    if (!Array.isArray(meals) || meals.length === 0) return ''
    const total = meals.reduce((sum, m) => sum + (m.analysis?.total_calories ?? 0), 0)
    return total <= calorieTarget ? 'bg-emerald-500' : 'bg-red-500'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={prevMonth} className="text-muted-foreground hover:text-foreground"><FiChevronLeft className="w-4 h-4" /></Button>
        <span className="text-sm font-semibold tracking-tight">{monthName}</span>
        <Button variant="ghost" size="sm" onClick={nextMonth} className="text-muted-foreground hover:text-foreground"><FiChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          const dotColor = getDayColor(day)
          const isToday = dateStr === todayCalStr
          return (
            <button key={dateStr} onClick={() => onSelect(dateStr)} className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all duration-150 ${isSelected ? 'bg-accent text-accent-foreground font-bold ring-2 ring-accent' : isToday ? 'bg-secondary font-semibold' : 'hover:bg-secondary/60'}`}>
              {day}
              {dotColor && <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`} />}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Under goal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Over goal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted inline-block" /> No data</span>
      </div>
    </div>
  )
}

// ──────── ErrorBoundary ────────
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ══════════════════════════════════════
// ══════ MAIN PAGE COMPONENT ══════════
// ══════════════════════════════════════
export default function Page() {
  // ──── Navigation ────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'profile'>('dashboard')

  // ──── Data State ────
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS)
  const [steps, setSteps] = useState(0)
  const [waterGlasses, setWaterGlasses] = useState(0)
  const [manualStepInput, setManualStepInput] = useState('')

  // ──── UI State ────
  const [sampleMode, setSampleMode] = useState(false)
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false)
  const [showCoachDialog, setShowCoachDialog] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<string>('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [savingMeal, setSavingMeal] = useState(false)
  const [mealCategory, setMealCategory] = useState('lunch')
  const [statusMessage, setStatusMessage] = useState('')

  // ──── Coach State ────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // ──── History State ────
  const [selectedHistoryDate, setSelectedHistoryDate] = useState('')

  // ──── Profile State ────
  const [profileForm, setProfileForm] = useState<Goals>(DEFAULT_GOALS)
  const [profileSaved, setProfileSaved] = useState(false)

  // ──── Refs ────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ──── Date for display (deferred to client to avoid hydration mismatch) ────
  const [currentDate, setCurrentDate] = useState('')
  const [greeting, setGreeting] = useState('')
  useEffect(() => {
    const now = new Date()
    setCurrentDate(formatDate(now))
    setGreeting(getGreeting(now.getHours()))
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setSelectedHistoryDate(todayIso)
  }, [])

  // ──── Load from localStorage ────
  useEffect(() => {
    try {
      const savedMeals = localStorage.getItem(LS_MEALS)
      if (savedMeals) {
        const parsed = JSON.parse(savedMeals)
        if (Array.isArray(parsed)) setMeals(parsed)
      }
      const savedGoals = localStorage.getItem(LS_GOALS)
      if (savedGoals) {
        const parsed = JSON.parse(savedGoals)
        if (parsed) { setGoals(parsed); setProfileForm(parsed) }
      }
      const savedSteps = localStorage.getItem(LS_STEPS)
      if (savedSteps) {
        const parsed = JSON.parse(savedSteps)
        if (typeof parsed === 'number') setSteps(parsed)
      }
      const savedWater = localStorage.getItem(LS_WATER)
      if (savedWater) {
        const parsed = JSON.parse(savedWater)
        if (typeof parsed === 'number') setWaterGlasses(parsed)
      }
    } catch (e) { /* ignore parse errors */ }
  }, [])

  // ──── Save to localStorage ────
  useEffect(() => { try { localStorage.setItem(LS_MEALS, JSON.stringify(meals)) } catch (e) {} }, [meals])
  useEffect(() => { try { localStorage.setItem(LS_GOALS, JSON.stringify(goals)) } catch (e) {} }, [goals])
  useEffect(() => { try { localStorage.setItem(LS_STEPS, JSON.stringify(steps)) } catch (e) {} }, [steps])
  useEffect(() => { try { localStorage.setItem(LS_WATER, JSON.stringify(waterGlasses)) } catch (e) {} }, [waterGlasses])

  // ──── Computed ────
  const [todayStr, setTodayStr] = useState('')
  useEffect(() => {
    const d = new Date()
    setTodayStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }, [])

  const sampleMeals = useMemo(() => getSampleMeals(todayStr), [todayStr])
  const displayMeals = sampleMode ? sampleMeals : meals
  const todayMeals = useMemo(() => displayMeals.filter(m => m.date === todayStr), [displayMeals, todayStr])
  const todayCalories = useMemo(() => todayMeals.reduce((sum, m) => sum + (m.analysis?.total_calories ?? 0), 0), [todayMeals])
  const todayProtein = useMemo(() => todayMeals.reduce((sum, m) => sum + (m.analysis?.total_protein_g ?? 0), 0), [todayMeals])
  const todayCarbs = useMemo(() => todayMeals.reduce((sum, m) => sum + (m.analysis?.total_carbs_g ?? 0), 0), [todayMeals])
  const todayFat = useMemo(() => todayMeals.reduce((sum, m) => sum + (m.analysis?.total_fat_g ?? 0), 0), [todayMeals])
  const displaySteps = sampleMode ? 7250 : steps

  const mealsByDate = useMemo(() => {
    const map: Record<string, MealEntry[]> = {}
    displayMeals.forEach(m => {
      if (!map[m.date]) map[m.date] = []
      map[m.date].push(m)
    })
    return map
  }, [displayMeals])

  const macroTargets = useMemo(() => ({
    protein: (goals.calorieTarget * goals.proteinPct / 100) / 4,
    carbs: (goals.calorieTarget * goals.carbsPct / 100) / 4,
    fat: (goals.calorieTarget * goals.fatPct / 100) / 9,
  }), [goals])

  // ──── Photo Capture ────
  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedPhotoFile(file)
    const url = URL.createObjectURL(file)
    setSelectedPhoto(url)
    setAnalysisResult(null)
    setAnalysisError('')
    setMealCategory('lunch')
    setShowAnalysisDialog(true)
    analyzePhoto(file)
  }, [])

  // ──── Analyze Photo ────
  const analyzePhoto = useCallback(async (file: File) => {
    setAnalyzing(true)
    setAnalysisError('')
    setActiveAgentId(FOOD_AGENT_ID)
    try {
      const uploadResult = await uploadFiles(file)
      if (!uploadResult.success || !Array.isArray(uploadResult.asset_ids) || uploadResult.asset_ids.length === 0) {
        setAnalysisError('Failed to upload photo. Please try again.')
        setAnalyzing(false)
        setActiveAgentId(null)
        return
      }
      const result = await callAIAgent(
        'Analyze this food photo and provide a detailed nutritional breakdown including all food items, portions, calories, macros (protein, carbs, fat), fiber, sugar, and sodium. Also categorize the meal and provide a summary.',
        FOOD_AGENT_ID,
        { assets: uploadResult.asset_ids }
      )
      if (result.success && result.response?.result) {
        const data = result.response.result as FoodAnalysis
        setAnalysisResult(data)
        if (data.meal_category) setMealCategory(data.meal_category.toLowerCase())
      } else {
        setAnalysisError(result.error || "Couldn't identify the food clearly. Try a better-lit photo.")
      }
    } catch (err) {
      setAnalysisError('An error occurred while analyzing. Please try again.')
    }
    setAnalyzing(false)
    setActiveAgentId(null)
  }, [])

  // ──── Save Meal ────
  const handleSaveMeal = useCallback(() => {
    if (!analysisResult) return
    setSavingMeal(true)
    const now = new Date()
    const newMeal: MealEntry = {
      id: generateId(),
      date: todayStr,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      photoUrl: selectedPhoto,
      analysis: analysisResult,
      category: mealCategory,
    }
    setMeals(prev => [...prev, newMeal])
    setSavingMeal(false)
    setShowAnalysisDialog(false)
    setStatusMessage('Meal saved successfully!')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [analysisResult, mealCategory, selectedPhoto, todayStr])

  // ──── Delete Meal ────
  const handleDeleteMeal = useCallback((id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id))
  }, [])

  // ──── Coach Chat ────
  const openCoach = useCallback(() => {
    setShowCoachDialog(true)
    if (chatMessages.length === 0) {
      sendCoachMessage("Summarize my nutritional day so far and give me personalized insights.", true)
    }
  }, [chatMessages.length])

  const sendCoachMessage = useCallback(async (message: string, isAuto = false) => {
    if (!message.trim()) return
    setChatLoading(true)
    setActiveAgentId(COACH_AGENT_ID)

    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date().toISOString() }
    if (!isAuto) {
      setChatMessages(prev => [...prev, userMsg])
    }

    const dailyData = {
      date: todayStr,
      total_calories_consumed: todayCalories,
      total_protein_g: todayProtein,
      total_carbs_g: todayCarbs,
      total_fat_g: todayFat,
      meals_logged: todayMeals.length,
      meal_details: todayMeals.map(m => ({
        time: m.time,
        category: m.category,
        calories: m.analysis?.total_calories ?? 0,
        items: Array.isArray(m.analysis?.food_items) ? m.analysis.food_items.map(f => f.name).join(', ') : '',
      })),
      steps: displaySteps,
      water_glasses: sampleMode ? 5 : waterGlasses,
      water_goal: goals.waterGoal,
      calorie_goal: goals.calorieTarget,
      step_goal: goals.stepGoal,
      macro_targets: macroTargets,
    }

    try {
      const result = await callAIAgent(
        `User message: "${message}"\n\nHere is my daily nutrition and fitness data: ${JSON.stringify(dailyData)}. Please analyze my progress and provide structured insights with caloric balance, insights array with types (positive/warning/suggestion/info), suggestions, and a motivational message. My daily calorie goal is ${goals.calorieTarget}.`,
        COACH_AGENT_ID
      )

      let assistantData: CoachResponse | null = null
      let assistantText = ''

      if (result.success && result.response?.result) {
        const d = result.response.result
        assistantData = {
          overall_status: d?.overall_status ?? 'on_track',
          caloric_balance: {
            consumed: d?.caloric_balance?.consumed ?? todayCalories,
            burned: d?.caloric_balance?.burned ?? 0,
            net: d?.caloric_balance?.net ?? todayCalories,
            daily_goal: d?.caloric_balance?.daily_goal ?? goals.calorieTarget,
            remaining: d?.caloric_balance?.remaining ?? (goals.calorieTarget - todayCalories),
          },
          insights: Array.isArray(d?.insights) ? d.insights : [],
          suggestions: Array.isArray(d?.suggestions) ? d.suggestions : [],
          motivational_message: d?.motivational_message ?? '',
        }
        assistantText = assistantData.motivational_message || 'Here are your insights for today.'
      } else {
        assistantText = result.error || 'Unable to get insights right now. Please try again.'
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: assistantText,
        data: assistantData,
        timestamp: new Date().toISOString(),
      }
      setChatMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    }

    setChatLoading(false)
    setActiveAgentId(null)
    setChatInput('')
  }, [todayCalories, todayProtein, todayCarbs, todayFat, todayMeals, displaySteps, goals, macroTargets, todayStr])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, chatLoading])

  // ──── Profile Save ────
  const handleSaveProfile = useCallback(() => {
    setGoals(profileForm)
    try { localStorage.setItem(LS_GOALS, JSON.stringify(profileForm)) } catch (e) {}
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }, [profileForm])

  // ──── Handle Steps ────
  const handleAddSteps = useCallback(() => {
    const val = parseInt(manualStepInput, 10)
    if (!isNaN(val) && val > 0) {
      setSteps(prev => prev + val)
      setManualStepInput('')
    }
  }, [manualStepInput])

  // ──── Export Summary ────
  const [exportCopied, setExportCopied] = useState(false)
  const handleExportSummary = useCallback(() => {
    const lines = [
      `NutriSnap Daily Summary - ${currentDate || todayStr}`,
      `${'='.repeat(40)}`,
      ``,
      `Calories: ${todayCalories} / ${goals.calorieTarget} cal`,
      `Protein: ${Math.round(todayProtein)}g | Carbs: ${Math.round(todayCarbs)}g | Fat: ${Math.round(todayFat)}g`,
      `Steps: ${displaySteps.toLocaleString()} / ${goals.stepGoal.toLocaleString()}`,
      `Water: ${waterGlasses} / ${goals.waterGoal} glasses`,
      ``,
      `Meals (${todayMeals.length}):`,
      ...todayMeals.map((m, i) => {
        const items = Array.isArray(m.analysis?.food_items) ? m.analysis.food_items.map(f => f.name).join(', ') : ''
        return `  ${i + 1}. ${m.category} @ ${m.time} - ${items} (${m.analysis?.total_calories ?? 0} cal)`
      }),
      ``,
      `Generated by NutriSnap`,
    ]
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2500)
    }).catch(() => {})
  }, [currentDate, todayStr, todayCalories, todayProtein, todayCarbs, todayFat, displaySteps, waterGlasses, todayMeals, goals])

  // ──── History Date Selection ────
  const historyDateMeals = useMemo(() => {
    return (mealsByDate[selectedHistoryDate] ?? [])
  }, [mealsByDate, selectedHistoryDate])

  const historyDateCalories = useMemo(() => historyDateMeals.reduce((sum, m) => sum + (m.analysis?.total_calories ?? 0), 0), [historyDateMeals])
  const historyDateProtein = useMemo(() => historyDateMeals.reduce((sum, m) => sum + (m.analysis?.total_protein_g ?? 0), 0), [historyDateMeals])
  const historyDateCarbs = useMemo(() => historyDateMeals.reduce((sum, m) => sum + (m.analysis?.total_carbs_g ?? 0), 0), [historyDateMeals])
  const historyDateFat = useMemo(() => historyDateMeals.reduce((sum, m) => sum + (m.analysis?.total_fat_g ?? 0), 0), [historyDateMeals])

  // ══════════════════════════════
  //          RENDER
  // ══════════════════════════════
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col" style={{ letterSpacing: '-0.01em', lineHeight: '1.5' }}>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture} />

        {/* Status Toast */}
        {statusMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium shadow-lg backdrop-blur-sm flex items-center gap-2">
            <FiCheck className="w-4 h-4" />
            {statusMessage}
          </div>
        )}

        {/* ═══════ Main Content ═══════ */}
        <div className="flex-1 pb-20 overflow-y-auto">
          {/* ──── Header ──── */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{greeting || 'Welcome'}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{currentDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <StreakBadge mealsByDate={mealsByDate} todayStr={todayStr} />
                <div className="flex items-center gap-2">
                  <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground">Demo</Label>
                  <Switch id="sample-toggle" checked={sampleMode} onCheckedChange={setSampleMode} />
                </div>
              </div>
            </div>
          </div>

          {/* ──── DASHBOARD TAB ──── */}
          {activeTab === 'dashboard' && (
            <div className="px-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Metric Tiles */}
              <div className="grid grid-cols-4 gap-2.5">
                <MetricTile icon={<RiFireLine className="w-4 h-4 text-orange-400" />} label="Calories" value={todayCalories} target={goals.calorieTarget} unit="cal" color="hsl(25, 95%, 53%)" />
                <MetricTile icon={<FiActivity className="w-4 h-4 text-rose-400" />} label="Burned" value={sampleMode ? 340 : 0} target={500} unit="cal" color="hsl(350, 80%, 55%)" />
                <MetricTile icon={<FiTarget className="w-4 h-4 text-emerald-400" />} label="Net" value={todayCalories - (sampleMode ? 340 : 0)} target={goals.calorieTarget} unit="cal" color="hsl(160, 70%, 40%)" />
                <MetricTile icon={<MdOutlineDirectionsWalk className="w-4 h-4 text-blue-400" />} label="Steps" value={displaySteps} target={goals.stepGoal} unit="" color="hsl(210, 80%, 55%)" />
              </div>

              {/* Macro Progress */}
              <Card className="bg-card border border-border shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <HiOutlineChartBar className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold">Macros</span>
                  </div>
                  <MacroBar label="Protein" value={todayProtein} max={macroTargets.protein} color="hsl(160, 70%, 40%)" />
                  <MacroBar label="Carbs" value={todayCarbs} max={macroTargets.carbs} color="hsl(210, 80%, 55%)" />
                  <MacroBar label="Fat" value={todayFat} max={macroTargets.fat} color="hsl(25, 95%, 53%)" />
                </CardContent>
              </Card>

              {/* Water Tracker */}
              <WaterTracker
                glasses={sampleMode ? 5 : waterGlasses}
                goal={goals.waterGoal}
                onAdd={() => setWaterGlasses(prev => prev + 1)}
                onRemove={() => setWaterGlasses(prev => Math.max(0, prev - 1))}
              />

              {/* Weekly Trend */}
              <WeeklyTrendChart mealsByDate={mealsByDate} calorieTarget={goals.calorieTarget} todayStr={todayStr} />

              {/* Today's Meals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                    <MdOutlineLocalDining className="w-4.5 h-4.5 text-accent" />
                    Today&apos;s Meals
                  </h2>
                  <span className="text-xs text-muted-foreground">{todayMeals.length} logged</span>
                </div>
                {todayMeals.length === 0 ? (
                  <Card className="bg-card border border-border shadow-md">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <FiCamera className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1">No meals logged yet</h3>
                      <p className="text-xs text-muted-foreground max-w-[220px]">Snap your first meal to get started tracking your nutrition</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2.5">
                    {todayMeals.map(meal => (
                      <MealCard key={meal.id} meal={meal} onDelete={handleDeleteMeal} />
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Steps Input */}
              <Card className="bg-card border border-border shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MdOutlineDirectionsWalk className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold">Log Steps</span>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Enter steps..." value={manualStepInput} onChange={(e) => setManualStepInput(e.target.value)} className="bg-muted border-border text-sm" />
                    <Button onClick={handleAddSteps} variant="outline" size="sm" className="px-4 border-accent/30 text-accent hover:bg-accent/10">Add</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Total today: {displaySteps.toLocaleString()} / {goals.stepGoal.toLocaleString()}</p>
                </CardContent>
              </Card>

              {/* CTA Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => fileInputRef.current?.click()} className="h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg shadow-emerald-500/20 transition-all duration-200">
                  <FiCamera className="w-4.5 h-4.5 mr-2" />
                  Snap Meal
                </Button>
                <Button onClick={openCoach} variant="outline" className="h-12 border-accent/30 text-accent hover:bg-accent/10 font-semibold transition-all duration-200">
                  <HiOutlineSparkles className="w-4.5 h-4.5 mr-2" />
                  Get Insights
                </Button>
              </div>

              {/* Export Summary */}
              {todayMeals.length > 0 && (
                <Button onClick={handleExportSummary} variant="outline" className="w-full h-10 border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 text-xs">
                  {exportCopied ? <><FiCheck className="w-3.5 h-3.5 mr-2 text-accent" /> Copied to clipboard</> : <><FiCopy className="w-3.5 h-3.5 mr-2" /> Export Daily Summary</>}
                </Button>
              )}

              {/* Agent Status */}
              <Card className="bg-card border border-border shadow-md">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Agents</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiImage className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs">Food Analysis (Gemini 2.5 Pro)</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activeAgentId === FOOD_AGENT_ID ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiActivity className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs">Fitness Coach (GPT-4.1)</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activeAgentId === COACH_AGENT_ID ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ──── HISTORY TAB ──── */}
          {activeTab === 'history' && (
            <div className="px-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-bold tracking-tight">History</h2>
              <Card className="bg-card border border-border shadow-md">
                <CardContent className="p-4">
                  <CalendarGrid selectedDate={selectedHistoryDate} onSelect={setSelectedHistoryDate} mealsByDate={mealsByDate} calorieTarget={goals.calorieTarget} />
                </CardContent>
              </Card>

              {/* Selected Date Summary */}
              <Card className="bg-card border border-border shadow-md">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">
                    {new Date(selectedHistoryDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {historyDateMeals.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No meals logged on this day</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-lg font-bold">{Math.round(historyDateCalories)}</p>
                          <p className="text-[10px] text-muted-foreground">Calories</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-lg font-bold">{Math.round(historyDateProtein)}</p>
                          <p className="text-[10px] text-muted-foreground">Protein g</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-lg font-bold">{Math.round(historyDateCarbs)}</p>
                          <p className="text-[10px] text-muted-foreground">Carbs g</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-lg font-bold">{Math.round(historyDateFat)}</p>
                          <p className="text-[10px] text-muted-foreground">Fat g</p>
                        </div>
                      </div>

                      {/* Calorie Bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Calorie Progress</span>
                          <span className="font-medium">{Math.round(historyDateCalories)} / {goals.calorieTarget}</span>
                        </div>
                        <Progress value={Math.min((historyDateCalories / goals.calorieTarget) * 100, 100)} className="h-2" />
                      </div>

                      {/* Photo Gallery */}
                      {historyDateMeals.some(m => m.photoUrl) && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Photos</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {historyDateMeals.filter(m => m.photoUrl).map(meal => (
                              <div key={meal.id + '-photo'} className="aspect-square rounded-xl overflow-hidden border border-border bg-muted relative group">
                                <img src={meal.photoUrl} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-1.5">
                                  <span className="text-[9px] text-white font-medium">{meal.analysis?.total_calories ?? 0} cal</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator className="bg-border" />

                      {/* Meals List */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meals</h4>
                        {historyDateMeals.map(meal => {
                          const items = Array.isArray(meal.analysis?.food_items) ? meal.analysis.food_items : []
                          return (
                            <div key={meal.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {meal.photoUrl ? <img src={meal.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : getCategoryIcon(meal.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{items.map(i => i.name).join(', ') || 'Meal'}</p>
                                <p className="text-[10px] text-muted-foreground">{meal.time} - {meal.category}</p>
                              </div>
                              <span className="text-xs font-semibold">{meal.analysis?.total_calories ?? 0} cal</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ──── PROFILE TAB ──── */}
          {activeTab === 'profile' && (
            <div className="px-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-bold tracking-tight">Settings</h2>

              {/* Calorie Target */}
              <Card className="bg-card border border-border shadow-md">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><FiTarget className="w-4 h-4 text-accent" /> Daily Calorie Target</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Input type="number" value={profileForm.calorieTarget} onChange={(e) => setProfileForm(prev => ({ ...prev, calorieTarget: parseInt(e.target.value) || 0 }))} className="bg-muted border-border text-lg font-semibold" />
                  <p className="text-[10px] text-muted-foreground mt-1.5">Recommended: 1500-2500 calories per day</p>
                </CardContent>
              </Card>

              {/* Macro Split */}
              <Card className="bg-card border border-border shadow-md">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><HiOutlineChartBar className="w-4 h-4 text-accent" /> Macro Split</CardTitle>
                  <CardDescription className="text-xs">Must add up to 100%</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Protein %</Label>
                    <Input type="number" min={0} max={100} value={profileForm.proteinPct} onChange={(e) => setProfileForm(prev => ({ ...prev, proteinPct: parseInt(e.target.value) || 0 }))} className="bg-muted border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Carbs %</Label>
                    <Input type="number" min={0} max={100} value={profileForm.carbsPct} onChange={(e) => setProfileForm(prev => ({ ...prev, carbsPct: parseInt(e.target.value) || 0 }))} className="bg-muted border-border mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fat %</Label>
                    <Input type="number" min={0} max={100} value={profileForm.fatPct} onChange={(e) => setProfileForm(prev => ({ ...prev, fatPct: parseInt(e.target.value) || 0 }))} className="bg-muted border-border mt-1" />
                  </div>
                  {(profileForm.proteinPct + profileForm.carbsPct + profileForm.fatPct) !== 100 && (
                    <p className="text-xs text-amber-400 flex items-center gap-1"><FiAlertTriangle className="w-3 h-3" /> Total is {profileForm.proteinPct + profileForm.carbsPct + profileForm.fatPct}% (should be 100%)</p>
                  )}
                </CardContent>
              </Card>

              {/* Step Goal */}
              <Card className="bg-card border border-border shadow-md">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><MdOutlineDirectionsWalk className="w-4 h-4 text-blue-400" /> Daily Step Goal</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Input type="number" value={profileForm.stepGoal} onChange={(e) => setProfileForm(prev => ({ ...prev, stepGoal: parseInt(e.target.value) || 0 }))} className="bg-muted border-border text-lg font-semibold" />
                </CardContent>
              </Card>

              {/* Water Goal */}
              <Card className="bg-card border border-border shadow-md">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><FiDroplet className="w-4 h-4 text-blue-400" /> Daily Water Goal</CardTitle>
                  <CardDescription className="text-xs">Number of glasses (250ml each)</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Input type="number" min={1} max={20} value={profileForm.waterGoal} onChange={(e) => setProfileForm(prev => ({ ...prev, waterGoal: parseInt(e.target.value) || 8 }))} className="bg-muted border-border text-lg font-semibold" />
                </CardContent>
              </Card>

              {/* Save */}
              <Button onClick={handleSaveProfile} className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg shadow-emerald-500/20">
                {profileSaved ? <><FiCheck className="w-4 h-4 mr-2" /> Saved!</> : 'Save Settings'}
              </Button>

              {/* Reset Steps & Water */}
              <Card className="bg-card border border-border shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Reset Today&apos;s Steps</p>
                      <p className="text-xs text-muted-foreground">Current: {steps.toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSteps(0)} className="border-destructive/30 text-red-400 hover:bg-destructive/10">Reset</Button>
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Reset Today&apos;s Water</p>
                      <p className="text-xs text-muted-foreground">Current: {waterGlasses} glasses</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setWaterGlasses(0)} className="border-destructive/30 text-red-400 hover:bg-destructive/10">Reset</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Clear All Data */}
              <Card className="bg-card border border-border shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Clear All Meal Data</p>
                      <p className="text-xs text-muted-foreground">{meals.length} meals stored</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setMeals([]); setChatMessages([]) }} className="border-destructive/30 text-red-400 hover:bg-destructive/10">Clear</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ═══════ Bottom Navigation ═══════ */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-40">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
              <RiFireLine className="w-5 h-5" />
              <span className="text-[10px] font-medium">Dashboard</span>
            </button>
            {/* Center FAB */}
            <button onClick={() => fileInputRef.current?.click()} className="relative -mt-6 w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-200 active:scale-95">
              <FiCamera className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${activeTab === 'history' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
              <FiTrendingUp className="w-5 h-5" />
              <span className="text-[10px] font-medium">History</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${activeTab === 'profile' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
              <FiUser className="w-5 h-5" />
              <span className="text-[10px] font-medium">Profile</span>
            </button>
          </div>
        </div>

        {/* ═══════ Meal Analysis Dialog ═══════ */}
        <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
          <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2"><FiCamera className="w-4 h-4 text-accent" /> Meal Analysis</DialogTitle>
            </DialogHeader>

            {/* Photo Preview */}
            {selectedPhoto && (
              <div className="rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                <img src={selectedPhoto} alt="Captured meal" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Loading State */}
            {analyzing && (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing your meal...</span>
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </div>
            )}

            {/* Error State */}
            {analysisError && !analyzing && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 mb-2">
                  <FiAlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Analysis Failed</span>
                </div>
                <p className="text-xs text-muted-foreground">{analysisError}</p>
                <Button onClick={() => { if (selectedPhotoFile) analyzePhoto(selectedPhotoFile) }} variant="outline" size="sm" className="mt-3 border-accent/30 text-accent hover:bg-accent/10">
                  Try Again
                </Button>
              </div>
            )}

            {/* Results */}
            {analysisResult && !analyzing && (
              <div className="space-y-4">
                {/* Summary */}
                {analysisResult.summary && (
                  <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                    <p className="text-xs text-foreground">{analysisResult.summary}</p>
                  </div>
                )}

                {/* Food Items */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Identified Items</h4>
                  <div className="space-y-1.5">
                    {Array.isArray(analysisResult.food_items) && analysisResult.food_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.name ?? 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">{item.portion_size ?? ''}</p>
                        </div>
                        <span className="text-sm font-semibold ml-2">{item.calories ?? 0} cal</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nutritional Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nutrition Breakdown</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">{analysisResult.total_calories ?? 0}</p>
                      <p className="text-[9px] text-muted-foreground">CALORIES</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">{Math.round(analysisResult.total_protein_g ?? 0)}</p>
                      <p className="text-[9px] text-muted-foreground">PROTEIN g</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">{Math.round(analysisResult.total_carbs_g ?? 0)}</p>
                      <p className="text-[9px] text-muted-foreground">CARBS g</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">{Math.round(analysisResult.total_fat_g ?? 0)}</p>
                      <p className="text-[9px] text-muted-foreground">FAT g</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-sm font-semibold">{Math.round(analysisResult.total_fiber_g ?? 0)}g</p>
                      <p className="text-[9px] text-muted-foreground">FIBER</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-sm font-semibold">{Math.round(analysisResult.total_sugar_g ?? 0)}g</p>
                      <p className="text-[9px] text-muted-foreground">SUGAR</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-sm font-semibold">{Math.round(analysisResult.total_sodium_mg ?? 0)}mg</p>
                      <p className="text-[9px] text-muted-foreground">SODIUM</p>
                    </div>
                  </div>
                </div>

                {/* Category Selector */}
                <div>
                  <Label className="text-xs text-muted-foreground">Meal Category</Label>
                  <div className="flex gap-2 mt-1.5">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map(cat => (
                      <button key={cat} onClick={() => setMealCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors border ${mealCategory === cat ? getCategoryColor(cat) + ' font-semibold' : 'border-border text-muted-foreground hover:text-foreground hover:border-border'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <Button onClick={handleSaveMeal} disabled={savingMeal} className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg shadow-emerald-500/20">
                  {savingMeal ? (
                    <><div className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin mr-2" /> Saving...</>
                  ) : (
                    <><FiCheck className="w-4 h-4 mr-2" /> Save Meal</>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══════ Coach Dialog ═══════ */}
        <Dialog open={showCoachDialog} onOpenChange={setShowCoachDialog}>
          <DialogContent className="bg-card border-border max-w-md h-[85vh] flex flex-col p-0">
            <DialogHeader className="p-4 pb-2 border-b border-border flex-shrink-0">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <HiOutlineSparkles className="w-4 h-4 text-accent" /> Fitness Coach
              </DialogTitle>
            </DialogHeader>

            {/* Chat Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && !chatLoading && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <HiOutlineSparkles className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Your AI Fitness Coach</h3>
                  <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">Ask about your nutrition, get personalized insights, or request meal suggestions.</p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] bg-accent text-accent-foreground rounded-2xl rounded-br-sm px-4 py-2.5">
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Coach structured data */}
                      {msg.data && (
                        <div className="space-y-2.5">
                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] px-2.5 py-0.5 ${msg.data.overall_status === 'on_track' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : msg.data.overall_status === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                              {msg.data.overall_status === 'on_track' ? <FiCheck className="w-3 h-3 mr-1" /> : <FiAlertTriangle className="w-3 h-3 mr-1" />}
                              {(msg.data.overall_status ?? '').replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>

                          {/* Caloric Balance */}
                          {msg.data.caloric_balance && (
                            <Card className="bg-muted/50 border-border">
                              <CardContent className="p-3">
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                  <div>
                                    <p className="font-bold text-base">{msg.data.caloric_balance.consumed ?? 0}</p>
                                    <p className="text-muted-foreground">Consumed</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-base">{msg.data.caloric_balance.burned ?? 0}</p>
                                    <p className="text-muted-foreground">Burned</p>
                                  </div>
                                  <div>
                                    <p className={`font-bold text-base ${(msg.data.caloric_balance.remaining ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{msg.data.caloric_balance.remaining ?? 0}</p>
                                    <p className="text-muted-foreground">Remaining</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Insights */}
                          {Array.isArray(msg.data.insights) && msg.data.insights.length > 0 && (
                            <div className="space-y-1.5">
                              {msg.data.insights.map((insight, j) => {
                                const style = getInsightStyle(insight.type)
                                return (
                                  <div key={j} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${style.bg}`}>
                                    <span className="mt-0.5 flex-shrink-0">{style.icon}</span>
                                    <p className={`text-xs leading-relaxed ${style.text}`}>{insight.message ?? ''}</p>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Suggestions */}
                          {Array.isArray(msg.data.suggestions) && msg.data.suggestions.length > 0 && (
                            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1.5">Suggestions</p>
                              <ul className="space-y-1">
                                {msg.data.suggestions.map((s, k) => (
                                  <li key={k} className="text-xs text-blue-300 flex items-start gap-1.5">
                                    <HiOutlineLightBulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Motivational */}
                          {msg.data.motivational_message && (
                            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                              <p className="text-xs text-foreground flex items-center gap-2">
                                <FiHeart className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                {msg.data.motivational_message}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Plain text message (if no structured data or as fallback) */}
                      {!msg.data && msg.content && (
                        <div className="max-w-[85%] bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5">
                          <div className="text-sm">{renderMarkdown(msg.content)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {chatLoading && (
                <div className="flex items-center gap-2 p-3">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">Coach is thinking...</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-border flex-shrink-0">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-1">
                  {['What should I eat next?', 'Am I on track?', 'Summarize my day'].map(chip => (
                    <button key={chip} onClick={() => sendCoachMessage(chip)} disabled={chatLoading} className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
                      {chip}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Input */}
            <div className="p-4 pt-2 flex-shrink-0">
              <div className="flex gap-2">
                <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCoachMessage(chatInput) } }} placeholder="Ask your coach..." className="bg-muted border-border text-sm flex-1" disabled={chatLoading} />
                <Button onClick={() => sendCoachMessage(chatInput)} disabled={chatLoading || !chatInput.trim()} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 px-3">
                  <FiSend className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  )
}
