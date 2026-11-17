/**
 * الحملة تاع الأسبوع — الهيرو (3 سكرولات)
 * ------------------------------------------------------------
 * باش تبدل المنتوج تاع الأسبوع: بدل غير الصور والنصوص هنا.
 * ما تمسش الأنيميشن (src/scripts/hero.js) ولا الـ HTML (src/components/Hero.astro).
 *
 * الصور: حطهم في public/hero/ ولا public/images/ واكتب المسار يبدا بـ "/".
 * - rawMaterialImg / heroProductImg: صور عمودية (4:5 تقريبا) تجي أحسن.
 * - complementaryItemsImg: صورة وحدة ولا حتى 3 صور (array).
 * - deliveryVehicleImg: SVG ولا PNG شفاف (بلا خلفية)، الكاميو يكون متوجه لليسار.
 */

export interface HeroCampaign {
  /** اسم داخلي باش تعرف واش من حملة (ما يبانش في السيت) */
  name: string;
  intro: { titleAr: string; titleFr: string };
  step1: { rawMaterialImg: string; heroProductImg: string; heroProductAlt: string; titleAr: string; titleFr: string };
  step2: { complementaryItemsImg: string | string[]; complementaryAlt: string; titleAr: string; titleFr: string };
  step3: { deliveryVehicleImg: string; sloganAr: string; sloganFr: string };
  /** وين يروح الزر في الأخير */
  cta: { labelAr: string; labelFr: string; href: string };
}

export const heroCampaign: HeroCampaign = {
  name: 'semaine-47-lit-blanc',

  intro: {
    titleAr: 'كل قطعة تبدا بلوح',
    titleFr: 'Tout commence par une planche',
  },

  step1: {
    rawMaterialImg: '/images/bois-brut.jpg',
    heroProductImg: '/images/lit-02.jpg',
    heroProductAlt: 'سرير أبيض بلوح راس وردي، من صنع الورشة',
    titleAr: 'ويولي سرير يدوم سنين',
    titleFr: 'et devient un lit qui dure',
  },

  step2: {
    complementaryItemsImg: ['/images/chevets.jpg', '/images/sommier.jpg'],
    complementaryAlt: 'طاولات جانبية وقاعدة سرير من نفس الورشة',
    titleAr: 'ونكملو الغرفة كاملة',
    titleFr: 'Toute la chambre, du même atelier',
  },

  step3: {
    deliveryVehicleImg: '/hero/van.svg',
    sloganAr: 'نوصّلو وين ما بغيت',
    sloganFr: 'On livre partout en Algérie',
  },

  cta: { labelAr: 'شوف المنتوجات', labelFr: 'Voir les produits', href: '#produits' },
};
