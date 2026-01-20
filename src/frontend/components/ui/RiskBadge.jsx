import PropTypes from 'prop-types';
import { cn } from "../../lib/utils";
import { AlertTriangle, AlertCircle, Info, Shield } from 'lucide-react';

/* ENUM VALUES */
const RiskLevels = ['critical', 'high', 'medium', 'low'];
const Sizes = ['sm', 'md', 'lg'];

const riskConfig = {
  critical: {
    label: 'Critical',
    className: 'bg-risk-critical text-risk-critical-foreground',
    icon: AlertCircle,
  },
  high: {
    label: 'High',
    className: 'bg-risk-high text-risk-high-foreground',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    className: 'bg-risk-medium text-risk-medium-foreground',
    icon: Info,
  },
  low: {
    label: 'Low',
    className: 'bg-risk-low text-risk-low-foreground',
    icon: Shield,
  },
};

const sizeConfig = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function RiskBadge({ level, showIcon, size }) {
  const config = riskConfig[level];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        config.className,
        sizeConfig[size]
      )}
    >
      {showIcon && (
        <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      )}
      {config.label}
    </span>
  );
}

/* DEFAULT PROPS */
RiskBadge.defaultProps = {
  showIcon: true,
  size: 'md',
};

/* PROP TYPES */
RiskBadge.propTypes = {
  level: PropTypes.oneOf(RiskLevels).isRequired,
  showIcon: PropTypes.bool,
  size: PropTypes.oneOf(Sizes),
};
