'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Trophy, BookOpen, TrendingUp } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/LanguageContext'

// ── types ──────────────────────────────────────────────────────────────────

interface WritingStats {
 totalWords: number
 streak: number
 bookCount: number
 milestonesReached: number[]
}

interface MilestoneConfig {
 words: number
 label: string
 emoji: string
 color: string
}

// ── constants ──────────────────────────────────────────────────────────────

const MILESTONES: MilestoneConfig[] = [
 { words: 1_000, label: '1K', emoji: '', color: 'bg-sky-500' },
 { words: 5_000, label: '5K', emoji: '', color: 'bg-bookcraft-blue' },
 { words: 10_000, label: '10K', emoji: '', color: 'bg-blue-500' },
 { words: 25_000, label: '25K', emoji: '', color: 'bg-amber-500' },
 { words: 50_000, label: '50K', emoji: '', color: 'bg-orange-500' },
 { words: 100_000, label: '100K', emoji: '', color: 'bg-rose-500' },
]

// ── helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
 if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
 if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
 return n.toString()
}

function getNextMilestone(totalWords: number): MilestoneConfig | null {
 return MILESTONES.find((m) => totalWords < m.words) ?? null
}

function getMilestoneProgress(totalWords: number): number {
 const next = getNextMilestone(totalWords)
 if (!next) return 100

 const milestoneIndex = MILESTONES.indexOf(next)
 const prev = milestoneIndex > 0 ? MILESTONES[milestoneIndex - 1].words : 0
 const range = next.words - prev
 const progress = totalWords - prev
 return Math.min(100, Math.round((progress / range) * 100))
}

// ── component ──────────────────────────────────────────────────────────────

interface Props {
 getIdToken: () => Promise<string | null>
}

export function WritingStatsWidget({ getIdToken }: Props) {
 const { t } = useLanguage()
 const [stats, setStats] = useState<WritingStats | null>(null)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 let cancelled = false

 async function load() {
 try {
 const token = await getIdToken()
 if (!token) return
 const res = await fetch('/api/stats', {
 headers: { Authorization: `Bearer ${token}` },
 })
 if (!res.ok) return
 const data: WritingStats = await res.json()
 if (!cancelled) setStats(data)
 } catch {
        // silent
 } finally {
 if (!cancelled) setLoading(false)
 }
 }

 load()
 return () => { cancelled = true }
 }, [getIdToken])

 if (loading) {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 animate-pulse">
 {[...Array(4)].map((_, i) => (
 <div key={i} className="h-20 rounded-2xl bg-muted" />
 ))}
 </div>
 )
 }

 if (!stats) return null

 const nextMilestone = getNextMilestone(stats.totalWords)
 const progress = getMilestoneProgress(stats.totalWords)

 return (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ type: 'spring', stiffness: 300, damping: 28 }}
 className="mb-8 space-y-4"
 >
 {/* ── Quick-stats row ── */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {/* Streak */}
 <StatCard
 icon={<Flame className="h-5 w-5 text-orange-400" />}
 label={t('statsStreak')}
 value={`${stats.streak} ${stats.streak === 1 ? t('statsDay') : t('statsDays')}`}
 accent="from-orange-500/10 to-amber-500/10"
 />
 {/* Total words */}
 <StatCard
 icon={<TrendingUp className="h-5 w-5 text-bookcraft-blue" />}
 label={t('statsTotalWords')}
 value={formatNumber(stats.totalWords)}
 accent="from-bookcraft-blue/10 to-bookcraft-blue/10"
 />
 {/* Books */}
 <StatCard
 icon={<BookOpen className="h-5 w-5 text-blue-400" />}
 label={t('statsBooks')}
 value={stats.bookCount.toString()}
 accent="from-blue-500/10 to-blue-500/10"
 />
 {/* Badges earned */}
 <StatCard
 icon={<Trophy className="h-5 w-5 text-amber-400" />}
 label={t('statsBadges')}
 value={`${stats.milestonesReached.length} / ${MILESTONES.length}`}
 accent="from-amber-500/10 to-yellow-500/10"
 />
 </div>

 {/* ── Progress toward next milestone ── */}
 {nextMilestone && (
 <div className="rounded-2xl border border-border/50 bg-card p-4">
 <div className="flex items-center justify-between mb-2.5">
 <span className="text-sm font-medium text-foreground">
 {nextMilestone.emoji} Next milestone — {nextMilestone.label} words
 </span>
 <span className="text-xs text-muted-foreground">
 {formatNumber(stats.totalWords)} / {formatNumber(nextMilestone.words)}
 </span>
 </div>
 <Progress
 value={progress}
 className="h-2.5 rounded-full bg-muted"
 />
 <p className="text-xs text-muted-foreground mt-1.5">
 {formatNumber(nextMilestone.words - stats.totalWords)} words to go
 </p>
 </div>
 )}

 {/* ── Milestone badges ── */}
 {stats.milestonesReached.length > 0 && (
 <div className="flex flex-wrap gap-2">
 {MILESTONES.map((m) => {
 const earned = stats.milestonesReached.includes(m.words)
 if (!earned) return null
 return (
 <motion.div
 key={m.words}
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ type: 'spring', stiffness: 400, damping: 20 }}
 >
 <Badge
 className={`gap-1.5 px-3 py-1 text-xs font-semibold text-white border-transparent ${m.color}`}
 >
 {m.emoji} {m.label}
 </Badge>
 </motion.div>
 )
 })}
 </div>
 )}
 </motion.div>
 )
}

// ── StatCard ──────────────────────────────────────────────────────────────

function StatCard({
 icon,
 label,
 value,
 accent,
}: {
 icon: React.ReactNode
 label: string
 value: string
 accent: string
}) {
 return (
 <div
 className={`rounded-2xl border border-border/50 bg-gradient-to-br ${accent} p-3.5 flex flex-col gap-2`}
 >
 <div className="flex items-center gap-2">
 {icon}
 <span className="text-xs text-muted-foreground font-medium">{label}</span>
 </div>
 <span className="text-xl font-bold text-foreground leading-none">{value}</span>
 </div>
 )
}
