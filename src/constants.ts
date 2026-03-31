export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  customization: string[];
}

export const products: Product[] = [
  {
    id: 1,
    name: "دبل تشيز برغر",
    description: "لحم بقري طازج، جبنة شيدر مزدوجة، صوص خاص",
    price: "8,500 د.ع",
    category: "وجبات رئيسية",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
    customization: ["بدون بصل", "إضافة هلابينو", "بدون طماطم"]
  },
  {
    id: 2,
    name: "بطاطا مقلية بالجبن",
    description: "بطاطا مقرمشة مغطاة بصوص الجبن الذائب",
    price: "4,000 د.ع",
    category: "مقبلات",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500",
    customization: ["صوص إضافي"]
  }
];

export const categories = ["وجبات رئيسية", "مقبلات", "مشروبات"];
