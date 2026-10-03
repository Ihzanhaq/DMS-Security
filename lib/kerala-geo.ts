/** District → taluk mapping for the work-location preference dropdowns. */
export const keralaTaluks: Record<string, string[]> = {
  "Thiruvananthapuram": ["Thiruvananthapuram", "Chirayinkeezhu", "Neyyattinkara", "Nedumangad", "Varkala", "Kattakkada"],
  "Kollam": ["Kollam", "Karunagappally", "Kunnathur", "Kottarakkara", "Punalur", "Pathanapuram"],
  "Pathanamthitta": ["Adoor", "Konni", "Kozhencherry", "Ranni", "Mallappally", "Thiruvalla"],
  "Alappuzha": ["Ambalappuzha", "Cherthala", "Karthikappally", "Kuttanad", "Mavelikkara", "Chengannur"],
  "Kottayam": ["Kottayam", "Changanassery", "Kanjirappally", "Meenachil", "Vaikom"],
  "Idukki": ["Devikulam", "Idukki", "Peerumade", "Thodupuzha", "Udumbanchola"],
  "Ernakulam": ["Aluva", "Kanayannur", "Kochi", "Kothamangalam", "Kunnathunad", "Muvattupuzha", "North Paravur"],
  "Thrissur": ["Thrissur", "Chalakudy", "Chavakkad", "Kodungallur", "Kunnamkulam", "Mukundapuram", "Thalapilly"],
  "Palakkad": ["Palakkad", "Alathur", "Chittur", "Mannarkkad", "Ottappalam", "Pattambi", "Attappady"],
  "Malappuram": ["Eranad", "Kondotty", "Nilambur", "Perinthalmanna", "Ponnani", "Tirur", "Tirurangadi"],
  "Kozhikode": ["Kozhikode", "Koyilandy", "Thamarassery", "Vatakara"],
  "Wayanad": ["Mananthavady", "Sulthan Bathery", "Vythiri"],
  "Kannur": ["Kannur", "Thalassery", "Taliparamba", "Iritty", "Payyanur"],
  "Kasaragod": ["Kasaragod", "Hosdurg", "Manjeshwaram", "Vellarikundu"],
};

export const keralaDistricts = Object.keys(keralaTaluks);
