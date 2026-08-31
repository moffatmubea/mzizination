import { useRef, useEffect, useMemo, useCallback } from 'react'
import { Tag, Typography, Badge } from 'antd'
import { WifiOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

function GameChart({ phase, multiplier, elapsedTime, countdown }) {
    const canvasRef = useRef(null)
    const rocketRef = useRef(null)
    const exhaustRef = useRef(null)
    const explosionRef = useRef(null)
    const containerRef = useRef(null)
    // Cache canvas dimensions to avoid expensive getBoundingClientRect every frame
    const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 })
    const particlesRef = useRef([])
    const trailRef = useRef([])
    const shakeRef = useRef({ intensity: 0, duration: 0 })
    const audioContextRef = useRef(null)

    // Initialize audio context for sound effects
    useEffect(() => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            }
        } catch (e) {
            console.log('Audio context not available')
        }
    }, [])

    // Trigger crash effects
    const triggerCrashEffects = useCallback((crashX, crashY) => {
        // Screen shake
        shakeRef.current = { intensity: 15, duration: 600 }
        
        if (containerRef.current) {
            containerRef.current.style.animation = 'none'
            setTimeout(() => {
                containerRef.current.style.animation = 'crash-shake 0.6s cubic-bezier(0.36, 0, 0.66, -0.56)'
            }, 10)
        }

        // Particle explosion
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30
            const speed = 8 + Math.random() * 8
            particlesRef.current.push({
                x: crashX,
                y: crashY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                life: 1,
                size: 2 + Math.random() * 6,
                color: ['#ff4444', '#ff7744', '#ffaa44', '#ffff00', '#ff6666'][Math.floor(Math.random() * 5)]
            })
        }

        // Play crash sound
        playCrashSound()
    }, [])

    // Play crash sound effect
    const playCrashSound = useCallback(() => {
        try {
            const ctx = audioContextRef.current
            if (!ctx) return
            
            const now = ctx.currentTime
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            
            osc.connect(gain)
            gain.connect(ctx.destination)
            
            osc.frequency.setValueAtTime(400, now)
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.3)
            
            gain.gain.setValueAtTime(0.3, now)
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
            
            osc.start(now)
            osc.stop(now + 0.3)
        } catch (e) {
            console.log('Sound effect failed')
        }
    }, [])

    // Trigger crash effects when phase changes to crashed
    useEffect(() => {
        if (phase === 'crashed' && canvasSizeRef.current.width > 0) {
            const endX = 60 + (elapsedTime / Math.max(elapsedTime + 2, 8)) * (canvasSizeRef.current.width - 120)
            const endY = canvasSizeRef.current.height * 0.4
            triggerCrashEffects(endX, endY)
        }
    }, [phase])

    // Dynamic scaling for both axes
    const maxTime = useMemo(() => {
        return Math.max(elapsedTime + 2, 8)
    }, [elapsedTime])

    const maxMultiplier = useMemo(() => {
        return Math.max(multiplier * 1.3, 2)
    }, [multiplier])

    // Y-axis labels - throttle updates to reduce re-renders
    const yAxisLabels = useMemo(() => {
        const roundedMax = Math.round(maxMultiplier * 10) / 10
        const labels = []
        const steps = 5
        for (let i = steps; i >= 0; i--) {
            const value = 1 + ((roundedMax - 1) * i / steps)
            labels.push(value.toFixed(1))
        }
        return labels
    }, [Math.round(maxMultiplier * 10)])

    // X-axis labels
    const xAxisLabels = useMemo(() => {
        const roundedMax = Math.ceil(maxTime)
        const labels = []
        const step = Math.ceil(roundedMax / 4)
        for (let i = step; i <= roundedMax; i += step) {
            labels.push(i)
        }
        return labels
    }, [Math.ceil(maxTime)])

    // Handle canvas resize only when needed (not every frame)
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const dpr = window.devicePixelRatio || 1
                const { width, height } = entry.contentRect
                canvas.width = width * dpr
                canvas.height = height * dpr
                canvasSizeRef.current = { width, height, dpr }
            }
        })
        observer.observe(canvas)

        // Initial size
        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvasSizeRef.current = { width: rect.width, height: rect.height, dpr }

        return () => observer.disconnect()
    }, [])

    // Draw chart - optimized
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const { width, height, dpr } = canvasSizeRef.current
        if (width === 0 || height === 0) return

        // Reset transform and clear
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, width, height)

        const padding = { left: 60, right: 30, top: 50, bottom: 60 }
        const chartWidth = width - padding.left - padding.right
        const chartHeight = height - padding.top - padding.bottom

        // Helper functions
        const timeToX = (time) => padding.left + (time / maxTime) * chartWidth
        const multiplierToY = (mult) => {
            const normalized = (mult - 1) / (maxMultiplier - 1)
            return height - padding.bottom - normalized * chartHeight
        }

        // Draw grid lines - batch into single path for performance
        ctx.strokeStyle = 'rgba(47, 69, 83, 0.25)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 6])
        ctx.beginPath()

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight * i / 5)
            ctx.moveTo(padding.left, y)
            ctx.lineTo(width - padding.right, y)
        }
        // Vertical grid lines
        for (let i = 0; i <= 4; i++) {
            const x = padding.left + (chartWidth * i / 4)
            ctx.moveTo(x, padding.top)
            ctx.lineTo(x, height - padding.bottom)
        }
        ctx.stroke()
        ctx.setLineDash([])

        // Draw curve when game is running or crashed
        if ((phase === 'running' || phase === 'crashed') && elapsedTime > 0) {
            // OPTIMIZED: Cap points at 200 max, use adaptive sampling
            const numPoints = Math.min(200, Math.max(80, Math.floor(elapsedTime * 20)))
            const points = new Array(numPoints + 1)

            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints
                const currentTime = elapsedTime * t
                const currentMult = Math.pow(Math.E, 0.1 * currentTime)
                const x = timeToX(currentTime)
                const y = Math.max(padding.top, multiplierToY(currentMult))
                points[i] = { x, y }
            }

            // Gradient fill under curve (single draw call)
            const fillGradient = ctx.createLinearGradient(
                padding.left, height - padding.bottom,
                timeToX(elapsedTime), multiplierToY(multiplier)
            )

            if (phase === 'crashed') {
                fillGradient.addColorStop(0, 'rgba(237, 66, 69, 0.02)')
                fillGradient.addColorStop(0.5, 'rgba(237, 66, 69, 0.25)')
                fillGradient.addColorStop(1, 'rgba(237, 66, 69, 0.5)')
            } else {
                fillGradient.addColorStop(0, 'rgba(255, 165, 0, 0.02)')
                fillGradient.addColorStop(0.3, 'rgba(255, 165, 0, 0.15)')
                fillGradient.addColorStop(0.6, 'rgba(255, 180, 50, 0.35)')
                fillGradient.addColorStop(1, 'rgba(255, 200, 80, 0.6)')
            }

            ctx.beginPath()
            ctx.moveTo(padding.left, height - padding.bottom)
            ctx.lineTo(points[0].x, points[0].y)
            for (let i = 1; i <= numPoints; i++) {
                ctx.lineTo(points[i].x, points[i].y)
            }
            ctx.lineTo(points[numPoints].x, height - padding.bottom)
            ctx.closePath()
            ctx.fillStyle = fillGradient
            ctx.fill()

            // ENHANCED: Multiple glow layers for better depth
            const lineColor = phase === 'crashed' ? '#ed4245' : '#f7931a'

            // Outer glow - large and soft
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            for (let i = 1; i <= numPoints; i++) {
                ctx.lineTo(points[i].x, points[i].y)
            }
            ctx.strokeStyle = phase === 'crashed'
                ? 'rgba(237, 66, 69, 0.08)'
                : 'rgba(247, 147, 26, 0.08)'
            ctx.lineWidth = 20
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.stroke()

            // Mid glow
            ctx.strokeStyle = phase === 'crashed'
                ? 'rgba(237, 66, 69, 0.12)'
                : 'rgba(247, 147, 26, 0.12)'
            ctx.lineWidth = 12
            ctx.stroke()

            // Inner shadow for depth
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
            ctx.lineWidth = 2
            ctx.stroke()

            // Main line with gradient and shadow
            const lineGradient = ctx.createLinearGradient(
                padding.left, 0,
                timeToX(elapsedTime), 0
            )
            if (phase === 'crashed') {
                lineGradient.addColorStop(0, '#f7931a')
                lineGradient.addColorStop(0.5, '#ff6655')
                lineGradient.addColorStop(1, '#ed4245')
            } else {
                lineGradient.addColorStop(0, '#f7931a')
                lineGradient.addColorStop(0.3, '#ffaa33')
                lineGradient.addColorStop(0.6, '#ffdd55')
                lineGradient.addColorStop(1, '#ffffff')
            }

            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            for (let i = 1; i <= numPoints; i++) {
                ctx.lineTo(points[i].x, points[i].y)
            }
            ctx.strokeStyle = lineGradient
            ctx.lineWidth = 5
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.shadowColor = lineColor
            ctx.shadowBlur = 20
            ctx.stroke()
            ctx.shadowBlur = 0

            // Update and draw particles
            const particles = particlesRef.current
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.3 // gravity
                p.life -= 0.015
                
                if (p.life <= 0) {
                    particles.splice(i, 1)
                } else {
                    // Draw particle
                    ctx.globalAlpha = p.life * 0.8
                    ctx.fillStyle = p.color
                    ctx.beginPath()
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                    ctx.fill()
                    
                    // Particle glow
                    ctx.strokeStyle = p.color
                    ctx.lineWidth = 1
                    ctx.globalAlpha = p.life * 0.4
                    ctx.stroke()
                }
            }
            ctx.globalAlpha = 1

            // Draw trail (recent path with fading effect)
            for (let i = 0; i < points.length - 1; i++) {
                const alpha = (i / points.length) * 0.3
                ctx.globalAlpha = alpha
                ctx.fillStyle = phase === 'crashed' ? '#ff4444' : '#ffff00'
                const size = 1 + (i / points.length) * 3
                ctx.fillRect(points[i].x - size/2, points[i].y - size/2, size, size)
            }
            ctx.globalAlpha = 1

            // Draw endpoint calculations
            const endX = timeToX(elapsedTime)
            const endY = multiplierToY(multiplier)

            // Calculate rotation angle
            let angle = 0
            if (numPoints >= 2) {
                const p1 = points[Math.max(0, numPoints - 10)]
                const p2 = points[numPoints]
                angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
            }

            // Sync HTML Elements over Canvas (using will-change for GPU acceleration)
            if (rocketRef.current) {
                if (phase === 'running') {
                    rocketRef.current.style.display = 'block'
                    rocketRef.current.style.left = `${endX}px`
                    rocketRef.current.style.top = `${endY}px`
                    rocketRef.current.style.transform = `translate(-50%, -50%) rotate(${angle}rad) rotate(90deg)`
                } else {
                    rocketRef.current.style.display = 'none'
                }
            }
            if (exhaustRef.current) {
                if (phase === 'running') {
                    exhaustRef.current.style.display = 'block'
                    exhaustRef.current.style.left = `${endX}px`
                    exhaustRef.current.style.top = `${endY}px`
                    exhaustRef.current.style.transform = `translate(-50%, -50%) rotate(${angle}rad) rotate(90deg) translate(0px, 95px)`
                } else {
                    exhaustRef.current.style.display = 'none'
                }
            }
            if (explosionRef.current) {
                if (phase === 'crashed') {
                    if (explosionRef.current.style.display !== 'block') {
                        explosionRef.current.style.display = 'block'
                        explosionRef.current.style.left = `${endX}px`
                        explosionRef.current.style.top = `${endY}px`
                        explosionRef.current.src = `${import.meta.env.BASE_URL}images/explosions/normal_explosion.gif?` + Date.now()

                        setTimeout(() => {
                            if (explosionRef.current) {
                                explosionRef.current.style.display = 'none'
                            }
                        }, 1000)
                    }
                } else {
                    explosionRef.current.style.display = 'none'
                }
            }
        }
    }, [phase, multiplier, elapsedTime, maxTime, maxMultiplier])

    const getStatusText = () => {
        if (phase === 'waiting') return `Starting in ${countdown.toFixed(1)}s`
        if (phase === 'crashed') return `Crashed @${multiplier.toFixed(2)}×`
        return null
    }

    const getMultiplierColor = () => {
        if (phase === 'crashed') return '#ed4245'
        if (multiplier >= 10) return '#35d06f'
        if (multiplier >= 5) return '#ffc107'
        if (multiplier >= 2) return '#f7931a'
        return '#ffffff'
    }

    return (
        <div ref={containerRef} className="chart-container-antd" style={{ position: 'relative' }}>
            <canvas ref={canvasRef} className="crash-canvas" />

            {/* In-game Overlay Assets - will-change for GPU compositing */}
            <img
                ref={rocketRef}
                src={`${import.meta.env.BASE_URL}images/spaceship.png`}
                alt="Rocket"
                style={{ position: 'absolute', width: '105px', height: 'auto', display: 'none', pointerEvents: 'none', zIndex: 10, filter: 'drop-shadow(0 0 10px rgba(247, 147, 26, 0.8))', willChange: 'transform, left, top' }}
            />
            <img
                ref={exhaustRef}
                src={`${import.meta.env.BASE_URL}images/exhaust/exhaust02_preview.gif`}
                alt="Exhaust"
                style={{ position: 'absolute', width: '150px', height: 'auto', display: 'none', pointerEvents: 'none', zIndex: 9, mixBlendMode: 'screen', filter: 'hue-rotate(340deg) saturate(2)', imageRendering: 'pixelated', willChange: 'transform, left, top' }}
            />
            <img
                ref={explosionRef}
                src={`${import.meta.env.BASE_URL}images/explosions/normal_explosion.gif`}
                alt="Explosion"
                style={{ position: 'absolute', width: '250px', height: 'auto', display: 'none', pointerEvents: 'none', zIndex: 11, transform: 'translate(-50%, -50%)', mixBlendMode: 'screen', imageRendering: 'pixelated' }}
            />

            {/* Y Axis Labels */}
            <div className="y-axis-antd">
                {yAxisLabels.map((label, i) => (
                    <Text key={i} className="axis-label" type="secondary">
                        {label}×
                    </Text>
                ))}
            </div>

            {/* X Axis Labels */}
            <div className="x-axis-antd">
                {xAxisLabels.map(label => (
                    <Text key={label} type="secondary" className="x-label">
                        {label}s
                    </Text>
                ))}
                <Text type="secondary" className="total-time-antd">
                    Total {Math.floor(elapsedTime)}s
                </Text>
            </div>

            {/* Multiplier Display */}
            <div className={`multiplier-container ${phase === 'crashed' ? 'crashed' : ''}`}>
                <Title
                    level={1}
                    className="multiplier-title"
                    style={{
                        color: getMultiplierColor(),
                        margin: 0,
                        fontSize: 90,
                        fontWeight: 800,
                        letterSpacing: '-2px',
                        textShadow: `0 0 40px ${getMultiplierColor()}50, 0 0 80px ${getMultiplierColor()}30`,
                        transition: 'color 0.2s ease',
                        fontFamily: "'Inter', -apple-system, sans-serif"
                    }}
                >
                    {multiplier.toFixed(2)}
                    <span className="multiplier-suffix">×</span>
                </Title>
            </div>

            {/* Status Message */}
            {(phase === 'waiting' || phase === 'crashed') && (
                <div className="status-container">
                    <Tag
                        color={phase === 'crashed' ? 'error' : 'warning'}
                        className="status-tag"
                        style={{
                            fontSize: 15,
                            padding: '8px 24px',
                            borderRadius: 24,
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                        }}
                    >
                        {getStatusText()}
                    </Tag>
                </div>
            )}

            {/* Network Status */}
            <div className="network-indicator">
                <Badge status="success" />
                <WifiOutlined style={{ color: 'var(--success)', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>Connected</Text>
            </div>
        </div>
    )
}

export default GameChart
