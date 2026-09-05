import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'brand', trend }) {
  const colorMap = {
    brand: {
      bg: 'bg-brand-500/10',
      text: 'text-brand-500',
      border: 'border-brand-500/20',
      glow: 'group-hover:border-brand-500/40'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      border: 'border-emerald-500/20',
      glow: 'group-hover:border-emerald-500/40'
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      border: 'border-amber-500/20',
      glow: 'group-hover:border-amber-500/40'
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-500',
      border: 'border-purple-500/20',
      glow: 'group-hover:border-purple-500/40'
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-500',
      border: 'border-rose-500/20',
      glow: 'group-hover:border-rose-500/40'
    }
  };

  const c = colorMap[color] || colorMap.brand;

  return (
    <div className={`group glass-panel bg-surface rounded-2xl p-5 border border-theme transition-all duration-200 ${c.glow} theme-transition`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-secondary">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${c.bg} ${c.text}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <h4 className="text-2xl font-bold text-primary tracking-tight">{value}</h4>
        {subtitle && <p className="text-xs text-secondary mt-1">{subtitle}</p>}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-theme flex items-center gap-1.5 text-xs">
          <span className={trend.positive ? 'text-emerald-500 font-medium' : 'text-rose-500 font-medium'}>
            {trend.value}
          </span>
          <span className="text-muted">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
