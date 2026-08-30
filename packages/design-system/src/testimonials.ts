/**
 * AIVO Design System - Testimonials Data
 * Placeholder testimonials (clearly labeled as synthetic until real data exists)
 */

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  content: string;
  rating: number;
  isPlaceholder: boolean;
  date: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "placeholder-1",
    name: "Alex M.",
    role: "Software Engineer",
    content:
      "AIVO has completely changed how I approach my health. The daily reminders and AI coaching keep me on track, and the progress charts make it easy to see my improvements over time. The nutrition tracking is incredibly intuitive.",
    rating: 5,
    isPlaceholder: true,
    date: "2026-08-15",
  },
  {
    id: "placeholder-2",
    name: "Sarah K.",
    role: "Marketing Manager",
    content:
      "As someone who's tried countless health apps, AIVO finally feels different. The personalized approach and AI recommendations actually adapt to my lifestyle. I've lost 15 pounds in 3 months without feeling deprived.",
    rating: 5,
    isPlaceholder: true,
    date: "2026-08-10",
  },
  {
    id: "placeholder-3",
    name: "Michael R.",
    role: "Freelance Designer",
    content:
      "The privacy-first approach was what drew me to AIVO initially, but the actual product quality kept me. The cross-device sync is seamless, and I love being able to log meals on my phone and analyze trends on my laptop.",
    rating: 5,
    isPlaceholder: true,
    date: "2026-08-05",
  },
  {
    id: "placeholder-4",
    name: "Emily T.",
    role: "Graduate Student",
    content:
      "The free tier is actually useful, not just a trial. When I upgraded to Pro, the AI coaching felt like having a supportive friend who happens to know a lot about nutrition and fitness. Highly recommend!",
    rating: 4,
    isPlaceholder: true,
    date: "2026-07-28",
  },
  {
    id: "placeholder-5",
    name: "David L.",
    role: "Small Business Owner",
    content:
      "I appreciate that AIVO doesn't make wild claims or push unrealistic expectations. The focus on sustainable habits and weekly insights has helped me build a healthier routine without overwhelming myself.",
    rating: 5,
    isPlaceholder: true,
    date: "2026-07-20",
  },
  {
    id: "placeholder-6",
    name: "Jennifer W.",
    role: "Healthcare Professional",
    content:
      "I recommend AIVO to patients looking for a wellness app that respects privacy. It's not a replacement for medical care, but it's excellent for habit tracking and motivation. The educational content is well-researched.",
    rating: 5,
    isPlaceholder: true,
    date: "2026-07-15",
  },
];

export const placeholderNotice =
  "Note: These testimonials are placeholder content for demonstration purposes. Replace with real user testimonials when available.";

export function getFeaturedTestimonials(count = 3): Testimonial[] {
  return testimonials.slice(0, count);
}
