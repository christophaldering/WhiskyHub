// CaskSense Apple — PhaseSignature
import React from 'react'
import { ThemeTokens } from '../theme/tokens'
import * as Icon from '../icons/Icons'

interface Props {
  phaseId: 'nose' | 'palate' | 'finish' | 'overall'
  th:      ThemeTokens
  size?:   'normal' | 'large'
}

export const PhaseSignature: React.FC<Props> = ({ phaseId, th, size = 'normal' }) => {
  const dim  = size === 'large' ? 40 : 32
  const icon = size === 'large' ? 22 : 18
  const phase = th.phases[phaseId]
  const IconC = phaseId === 'nose' ? Icon.Nose : phaseId === 'palate' ? Icon.Palate : phaseId === 'finish' ? Icon.Finish : Icon.Overall

  return (
    <div style={{
      width: dim, height: dim, borderRadius: dim / 2.5,
      background: phase.dim,
      border: `1px solid ${phase.accent}70`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <IconC color={phase.accent} size={icon} />
    </div>
  )
}
