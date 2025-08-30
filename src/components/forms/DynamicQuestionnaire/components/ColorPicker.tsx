import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Check } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  onBlur?: () => void
  presetColors?: string[]
  allowCustom?: boolean
}

const defaultPresets = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#000000', // black
  '#ffffff', // white
]

export function ColorPicker({ 
  value = '#3b82f6', 
  onChange, 
  onBlur,
  presetColors = defaultPresets,
  allowCustom = true
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(value)

  const handleColorSelect = (color: string) => {
    onChange(color)
    setCustomColor(color)
    setIsOpen(false)
    onBlur?.()
  }

  const getContrastColor = (hexColor: string) => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  return (
    <div className="relative">
      {/* Color Display Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 rounded-xl
          bg-white/10 border-2 transition-all duration-200
          ${isOpen 
            ? 'border-primary-500/50 shadow-lg shadow-primary-500/10' 
            : 'border-white/20 hover:border-white/30 hover:bg-white/15'
          }
          group
        `}
      >
        <div className="flex items-center gap-3">
          <Palette className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary-400' : 'text-white/40 group-hover:text-white/60'}`} />
          
          <div className="flex items-center gap-3 flex-1">
            <motion.div
              className="w-8 h-8 rounded-lg shadow-inner relative overflow-hidden"
              style={{ backgroundColor: value }}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Checkerboard pattern for transparency */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `repeating-conic-gradient(#ffffff 0% 25%, #cccccc 0% 50%)`,
                  backgroundSize: '8px 8px'
                }}
              />
            </motion.div>
            
            <span className="text-sm font-mono text-white/80 uppercase">
              {value}
            </span>
          </div>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-5 h-5 rounded-full border-2 border-white/30"
            style={{ backgroundColor: value }}
          />
        </div>
      </button>

      {/* Color Picker Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-xl border-2 border-white/20 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Preset Colors Grid */}
            <div className="p-4">
              <div className="text-xs text-white/50 mb-3">Preset Colors</div>
              <div className="grid grid-cols-5 gap-2">
                {presetColors.map((color) => {
                  const isSelected = value.toLowerCase() === color.toLowerCase()
                  
                  return (
                    <motion.button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={`
                        relative w-full aspect-square rounded-lg shadow-sm
                        ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-900' : ''}
                        hover:scale-110 transition-transform
                      `}
                      style={{ backgroundColor: color }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check 
                            className="w-4 h-4" 
                            style={{ color: getContrastColor(color) }}
                            strokeWidth={3}
                          />
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Custom Color Input */}
            {allowCustom && (
              <div className="border-t border-white/10 p-4">
                <div className="text-xs text-white/50 mb-2">Custom Color</div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg">
                      <div 
                        className="w-6 h-6 rounded border border-white/30"
                        style={{ backgroundColor: customColor }}
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-mono text-white/80 outline-none"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => handleColorSelect(customColor)}
                    className="px-4 py-2 bg-primary-500/20 text-primary-400 border border-primary-500/40 rounded-lg hover:bg-primary-500/30 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Apply
                  </motion.button>
                </div>
              </div>
            )}

            {/* Recent Colors */}
            {value && !presetColors.includes(value) && (
              <div className="border-t border-white/10 p-4">
                <div className="text-xs text-white/50 mb-2">Current Color</div>
                <button
                  type="button"
                  onClick={() => handleColorSelect(value)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div 
                    className="w-6 h-6 rounded border border-white/30"
                    style={{ backgroundColor: value }}
                  />
                  <span className="text-sm font-mono text-white/80">{value}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
