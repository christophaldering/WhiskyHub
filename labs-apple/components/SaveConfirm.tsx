// CaskSense Apple — SaveConfirm (300ms Flash)
import React from 'react'
import * as Icon from '../icons/Icons'

interface Props { show: boolean; color: string }

export const SaveConfirm: React.FC<Props> = ({ show, color }) => {
  if (!show) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 999, pointerEvents: 'none',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 40,
        background: `${color}38`,
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'saveFlash 300ms ease forwards',
      }}>
        <Icon.Check color={color} size={32} />
      </div>
    </div>
  )
}
