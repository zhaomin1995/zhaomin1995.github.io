/*
 * places.js — Travel destination data for the 3D globe (travel.html)
 *
 * How to add a new destination:
 *   1. Add a photo to img/travel/ (e.g., "tokyo.jpg")
 *   2. Add an entry below with the photo filename in the `img` field
 *   3. Only places with a valid `img` file will show on the globe
 *
 * Fields:
 *   id    — unique identifier (used for folder/filename matching)
 *   en    — { name, desc } in English
 *   zh    — { name, desc } in Chinese
 *   lat   — latitude
 *   lng   — longitude
 *   img   — filename in img/travel/ (e.g., "newyork.jpg"), or empty string to hide
 */
const PLACES = [
  {
    id: 'new-york',
    en: { name: 'New York', desc: 'The Big Apple, the city that never sleeps' },
    zh: { name: '纽约', desc: '大苹果城，不夜之城' },
    lat: 40.7128, lng: -74.0060,
    img: 'new-york.jpg'
  },
  {
    id: 'san-francisco',
    en: { name: 'San Francisco', desc: 'Golden Gate Bridge and tech capital' },
    zh: { name: '旧金山', desc: '金门大桥与科技之城' },
    lat: 37.7749, lng: -122.4194,
    img: 'san-francisco.jpg'
  },
  {
    id: 'denton',
    en: { name: 'Denton, TX', desc: 'Where university life happened' },
    zh: { name: '丹顿', desc: '大学生活的地方' },
    lat: 33.2148, lng: -97.1331,
    img: 'denton.jpg'
  },
  {
    id: 'pittsburgh',
    en: { name: 'Pittsburgh', desc: 'Steel City, where I got my master\'s' },
    zh: { name: '匹兹堡', desc: '钢铁之城，硕士求学之地' },
    lat: 40.4406, lng: -79.9959,
    img: 'pittsburgh.jpg'
  },
  {
    id: 'shenzhen',
    en: { name: 'Shenzhen', desc: 'Home, where I did my undergrad' },
    zh: { name: '深圳', desc: '家乡，本科求学之地' },
    lat: 22.5431, lng: 114.0579,
    img: 'shenzhen.jpg'
  },
  {
    id: 'los-angeles',
    en: { name: 'Los Angeles', desc: 'City of Angels' },
    zh: { name: '洛杉矶', desc: '天使之城' },
    lat: 34.0522, lng: -118.2437,
    img: 'los-angeles.jpg'
  },
];
