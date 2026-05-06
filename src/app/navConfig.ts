import {
  Activity,
  Archive,
  BadgeCheck,
  BookOpen,
  Boxes,
  Database,
  FileClock,
  Home,
  Lock,
  Radio,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import type { AppRoute } from '../lib/fhir/types';

export type NavItem = {
  id: string;
  label: string;
  route?: AppRoute;
  enabled: boolean;
  Icon: typeof Home;
};

export const primaryNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', route: 'dashboard', enabled: true, Icon: Home },
  { id: 'implementation-guides', label: 'Implementation Guides', route: 'implementation-guides', enabled: true, Icon: BookOpen }
];

export const comingSoonItems: NavItem[] = [
  { id: 'openid', label: 'OpenID Connect', enabled: false, Icon: ShieldCheck },
  { id: 'smart', label: 'SMART on FHIR', enabled: false, Icon: Stethoscope },
  { id: 'terminology', label: 'Terminology', enabled: false, Icon: BadgeCheck },
  { id: 'operations', label: 'Operations', enabled: false, Icon: Activity },
  { id: 'subscriptions', label: 'Subscriptions', enabled: false, Icon: Radio },
  { id: 'bulk-data', label: 'Bulk Data', enabled: false, Icon: Database },
  { id: 'audit', label: 'Audit', enabled: false, Icon: FileClock },
  { id: 'archive', label: 'Archive', enabled: false, Icon: Archive },
  { id: 'packages', label: 'Packages', enabled: false, Icon: Boxes },
  { id: 'locked', label: 'Advanced Modules', enabled: false, Icon: Lock }
];
