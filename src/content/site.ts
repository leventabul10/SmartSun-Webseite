import siteDefaults from '../../content/site.json';

export interface NavItem {
  label: string;
  path: string;
  children?: NavItem[];
}

export interface OpeningHour {
  label: string;
  value: string;
}

export interface Company {
  name: string;
  tagline: string;
  address: string[];
  phone: string;
  phoneShort: string;
  emergencyPhone: string;
  email: string;
  emailManaging: string;
  appointmentEmail: string;
  openingHours: OpeningHour[];
}

export interface SiteData {
  company: Company;
  galleryNav: NavItem[];
  navigation: NavItem[];
  footerLinks: NavItem[];
}

const clone = <T>(value: T): T => structuredClone(value);

export const company: Company = clone(siteDefaults.company);
export const galleryNav: NavItem[] = clone(siteDefaults.galleryNav);
export const navigation: NavItem[] = clone(siteDefaults.navigation);
export const footerLinks: NavItem[] = clone(siteDefaults.footerLinks);

const mapsQuery = (): string => encodeURIComponent(company.address.join(', '));

export const maps = {
  get url(): string {
    return `https://www.google.com/maps/search/?api=1&query=${mapsQuery()}`;
  },
  get embed(): string {
    return `https://maps.google.com/maps?q=${mapsQuery()}&z=15&output=embed`;
  },
  get label(): string {
    return company.address.join(', ');
  },
};

export function applySiteData(data: SiteData): void {
  Object.assign(company, data.company);
  galleryNav.splice(0, galleryNav.length, ...data.galleryNav);
  navigation.splice(0, navigation.length, ...data.navigation);
  footerLinks.splice(0, footerLinks.length, ...data.footerLinks);
}
