// Block types untuk landing page builder.
// Port mentah dari template-go/frontend/src/features/builder/types/builder.types.ts
// dengan beberapa adapt sesuai stack template-base.

export type ComponentType =
  | 'navbar'
  | 'slider'
  | 'html_block'
  | 'card_grid'
  | 'image_block'
  | 'article_grid'
  | 'footer'

export interface BuilderComponent {
  id: string
  type: ComponentType
  props: Record<string, unknown>
}

export interface BentoRow {
  cols: number
  cells: string[]
}

// ─── Default Props ───
// Dipakai saat user klik "Tambah block" — props auto-populated dengan default
// supaya render preview-nya tidak kosong. Admin tinggal customize via Properties.

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  navbar: 'Navbar',
  slider: 'Slider',
  html_block: 'HTML Block',
  card_grid: 'Card Grid',
  image_block: 'Image Block',
  article_grid: 'Article Grid',
  footer: 'Footer',
}

export const COMPONENT_DEFAULTS: Record<ComponentType, Record<string, unknown>> = {
  navbar: {
    bgColor: '#ffffff',
    textColor: '#333333',
    hoverColor: '#0d6efd',
    sticky: true,
    shadow: true,
    borderBottom: false,
    borderColor: '#e0e0e0',
    showCtaButton: true,
    brandTitle: 'Brand',
    logoUrl: '',
    logoWidth: 120,
    padding: 'md',
    menuAlign: 'right',
    btnBgColor: '#0d6efd',
    btnTextColor: '#ffffff',
    btnBorderColor: '#0d6efd',
    sectionId: 'header',
    menu_navbar_id: '',
  },
  slider: {
    slider_id: '',
    height: 'fullscreen',
    showArrows: true,
    showIndicators: true,
    indicatorColor: '#ffffff',
    arrowColor: '#ffffff',
    overlayColor: '#000000',
    overlayOpacity: 0.4,
    captionColor: '#ffffff',
    borderRadius: 0,
    transitionSpeed: 500,
    sectionId: '',
  },
  html_block: {
    html: '<h2>Judul Section</h2><p>Konten Anda di sini...</p>',
    bgColor: 'rgba(255,255,255,1)',
    textColor: 'rgba(33,37,41,1)',
    padding: 'medium',
    containerWidth: 'container',
    bgImage: '',
    bgSize: 'cover',
    bgPosition: 'center',
    bgRepeat: 'no-repeat',
    overlayColor: 'rgba(0,0,0,0.3)',
    bgFixed: false,
    customCSS: '',
    marginTop: '0',
    marginBottom: '0',
    hideOnMobile: false,
    hideOnDesktop: false,
    sectionId: '',
  },
  card_grid: {
    sectionBg: 'rgba(248,249,250,1)',
    sectionBgImage: '',
    sectionBgSize: 'cover',
    sectionBgPosition: 'center',
    sectionBgRepeat: 'no-repeat',
    sectionOverlayColor: 'rgba(0,0,0,0.3)',
    sectionBgFixed: false,
    cardBg: 'rgba(255,255,255,1)',
    textColor: 'rgba(33,37,41,1)',
    borderColor: 'rgba(222,226,230,1)',
    borderRadius: 8,
    cardShadow: 'sm',
    cardPadding: '3',
    gap: 'medium',
    bentoRows: [{ cols: 2, cells: ['', ''] }],
    sectionId: '',
  },
  image_block: {
    src: '',
    alt: '',
    width: 'full',
    align: 'center',
    bgColor: '#f8f9fa',
    shadow: 'none',
    sectionId: '',
  },
  article_grid: {
    title: 'Berita Terbaru',
    limit: 6,
    cols: 3,
    sectionBg: '#ffffff',
    bgImage: '',
    bgSize: 'cover',
    bgPosition: 'center',
    bgRepeat: 'no-repeat',
    overlayColor: '#000000',
    overlayOpacity: 0.3,
    bgFixed: false,
    titleColor: '#212529',
    cardBg: '#ffffff',
    cardTextColor: '#212529',
    metaColor: '#6c757d',
    cardGap: 4,
    cardRadius: 8,
    cardShadow: 'sm',
    imageRatio: '60',
    hoverEffect: 'lift',
    sectionId: '',
  },
  footer: {
    footer_id: '',
    bgColor: '#212529',
    textColor: '#ffffff',
    headingColor: '#ffffff',
    linkColor: '#adb5bd',
    linkHoverColor: '#0d6efd',
    padding: 'lg',
    borderTop: false,
    borderColor: '#0d6efd',
    copyrightText: '',
    showCopyright: false,
    minHeight: '',
    bgImage: '',
    bgSize: 'cover',
    bgPosition: 'center',
    bgRepeat: 'no-repeat',
    overlayColor: '#000000',
    overlayOpacity: 0.6,
    bgFixed: false,
    sectionId: 'footer',
  },
}

// generateId — utility untuk bikin block id baru saat add block.
// Format singkat: c_<timestamp>_<random>. Tidak butuh uuid library penuh.
export function generateId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
