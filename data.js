// База данных тональных средств
const productsDB = {
    "MAC": {
        lines: {
            "Studio Fix Fluid SPF 15": [
                { shade: "NC15", hex: "#F5E6D3", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC20", hex: "#F0D5B8", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC25", hex: "#EDD0AA", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC30", hex: "#E8C9A0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC35", hex: "#E5C296", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC40", hex: "#E0B88D", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC42", hex: "#D9B085", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC45", hex: "#D4A87C", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NC50", hex: "#C99A70", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW10", hex: "#F0DDD1", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW13", hex: "#EDD5C5", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW15", hex: "#E8CDB8", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW20", hex: "#E3C4AA", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW25", hex: "#DDBA9E", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW30", hex: "#D8B192", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW35", hex: "#D4A88A", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW40", hex: "#CD9E80", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW43", hex: "#C79678", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW45", hex: "#C18E70", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 },
                { shade: "NW50", hex: "#B88365", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 2890 }
            ]
        }
    },
    "Estée Lauder": {
        lines: {
            "Double Wear": [
                { shade: "1N0 Porcelain", hex: "#F2E0D5", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3690 },
                { shade: "2N1 Desert Beige", hex: "#DEC0AA", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3690 },
                { shade: "3N1 Medium Beige", hex: "#D0B09A", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3690 },
                { shade: "4N1 Shell Beige", hex: "#CAB898", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3690 },
                { shade: "5N1 Deep Tan", hex: "#B09072", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3690 }
            ]
        }
    },
    "Dior": {
        lines: {
            "Forever Skin Glow": [
                { shade: "0N Neutral", hex: "#F2DDD0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4290 },
                { shade: "1N Neutral", hex: "#E8D0C0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4290 },
                { shade: "2N Neutral", hex: "#DEC5B0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4290 },
                { shade: "3N Neutral", hex: "#D4B8A0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4290 }
            ]
        }
    },
    "NARS": {
        lines: {
            "Light Reflecting": [
                { shade: "Siberia", hex: "#F5EBE0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4490 },
                { shade: "Deauville", hex: "#EBDDD0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4490 },
                { shade: "Fiji", hex: "#E6D7C8", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4490 },
                { shade: "Punjab", hex: "#E1D1C0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4490 }
            ]
        }
    },
    "Fenty Beauty": {
        lines: {
            "Pro Filt'r Soft Matte": [
                { shade: "100", hex: "#FAF0E6", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3290 },
                { shade: "120", hex: "#F0E6DB", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3290 },
                { shade: "140", hex: "#E6DCD1", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3290 },
                { shade: "160", hex: "#DCD2C7", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3290 },
                { shade: "180", hex: "#D2C8BD", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3290 }
            ]
        }
    },
    "Lancôme": {
        lines: {
            "Teint Idole Ultra Wear": [
                { shade: "090 Ivoire N", hex: "#F5E8DD", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3890 },
                { shade: "110 C", hex: "#EBDDD0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3890 },
                { shade: "130 W", hex: "#D7C5B0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3890 },
                { shade: "145 W", hex: "#C8B398", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3890 },
                { shade: "170 C", hex: "#AF9570", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 3890 }
            ]
        }
    },
    "YSL Beauty": {
        lines: {
            "All Hours": [
                { shade: "B5 Porcelain", hex: "#F5E6D3", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4590 },
                { shade: "B20 Ivory", hex: "#E8D0C0", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4590 },
                { shade: "B30 Almond", hex: "#DEC0AA", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4590 },
                { shade: "B40 Sand", hex: "#D4B096", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4590 },
                { shade: "B50 Honey", hex: "#CAA082", image: "Скинкод%20фотки%20сайт/example.png", url: "https://goldapple.ru/", price: 4590 }
            ]
        }
    }
};

// Маппинг оттенков между брендами (для рекомендаций)
const shadeMapping = {
    "light_warm": ["NC15", "NC20", "1N0", "100", "B5", "Siberia"],
    "light_neutral": ["N12", "1N0", "110", "B15", "0N"],
    "light_cool": ["NW10", "NW13", "1N0", "0N", "B5", "Siberia"],
    "medium_warm": ["NC30", "NC35", "2N1", "120", "B20", "Deauville"],
    "medium_neutral": ["N25", "2N1", "B15", "1N", "Fiji"],
    "medium_cool": ["NW20", "NW25", "2N1", "1N", "B20", "Deauville"],
    "tan_warm": ["NC40", "NC42", "3N1", "140", "B30", "Fiji"],
    "tan_neutral": ["N35", "3N1", "B25", "145", "Punjab"],
    "tan_cool": ["NW30", "NW35", "3N1", "130", "B30", "Punjab"],
    "deep_warm": ["NC45", "NC50", "4N1", "160", "B40", "Punjab"],
    "deep_neutral": ["N40", "4N1", "B35", "170", "Punjab"],
    "deep_cool": ["NW40", "NW43", "4N1", "170", "B40", "Punjab"]
};
