// 狩獵地圖與怪物資料設定檔

export const gameData = {
    // 7.0 版本資料
    "7.0": {
        "奧闊帕恰山": {
            mapImage: "maps/奧闊帕恰山.png",
            mapNameEn: "Urqopacha",
            monsters: [
                { name: "內丘奇霍", nameEn: "Nechuciho", rank: "A" },
                { name: "女王鷹蜂", nameEn: "Queen hawk", rank: "A" },
                { name: "厭忌之人奇里格", nameEn: "Kirlirger the Abhorrent", rank: "S" },
                { name: "水晶化身之王", nameEn: "arch aethereater", rank: "SS" }
            ],
            aetherytes: [
                { name: "瓦丘恩佩洛", x: 28.1, y: 13.2 },
                { name: "沃拉的迴響", x: 30.8, y: 34.2 }
            ],
            points: [
                { label: "A", x: 7.5, y: 25.6 },
                { label: "B", x: 11.5, y: 9.1 },
                { label: "C", x: 15.7, y: 24.2 },
                { label: "D", x: 19.1, y: 14.2 },
                { label: "E", x: 21.9, y: 20.9 },
                { label: "F", x: 28.1, y: 22.9 },
                { label: "G", x: 28.9, y: 9.4 },
            ]
        },
        "克札瑪烏卡濕地": {
            mapImage: "maps/克札瑪烏卡濕地.png",
            mapNameEn: "Kozama'uka",
            monsters: [
                { name: "驚雨蟾蜍", nameEn: "The raintriller", rank: "A" },
                { name: "普庫恰", nameEn: "Pkuucha", rank: "A" },
                { name: "伊努索奇", nameEn: "Ihnuxokiy", rank: "S" },
                { name: "水晶化身之王", nameEn: "arch aethereater", rank: "SS" }
            ],
            aetherytes: [
                { name: "土陶郡", x: 11.9, y: 27.7 },
                { name: "哈努聚落", x: 18.1, y: 11.9 },
                { name: "朋友的燈火", x: 32.3, y: 25.6 },
                { name: "水果碼頭", x: 37.3, y: 16.8 }
            ],
            points: [
                { label: "A", x: 5.3, y: 28.8 },
                { label: "B", x: 6.4, y: 12.1 },
                { label: "C", x: 9.5, y: 7.8 },
                { label: "D", x: 13.8, y: 14.8 },
                { label: "E", x: 15.8, y: 23.8 },
                { label: "F", x: 16.3, y: 17.3 },
                { label: "G", x: 20.3, y: 28.4 },
                { label: "H", x: 24.0, y: 36.6 },
                { label: "I", x: 36.8, y: 20.4 }
            ]
        },
        "亞克特爾樹海": {
            mapImage: "maps/亞克特爾樹海.png",
            mapNameEn: "Yak T'el",
            monsters: [
                { name: "幻煌鳥", nameEn: "Starcrier", rank: "A" },
                { name: "血鳴鼠", nameEn: "Rrax yity'a", rank: "A" },
                { name: "內尤佐緹", nameEn: "Neyoozoteel", rank: "S" },
                { name: "水晶化身之王", nameEn: "arch aethereater", rank: "SS" }
            ],
            aetherytes: [
                { name: "紅豹村", x: 13.5, y: 12.8 },
                { name: "瑪穆克", x: 35.9, y: 32.0 }
            ],
            points: [
                { label: "A", x: 8.6, y: 19.5 },
                { label: "B", x: 21.3, y: 36.4 },
                { label: "C", x: 21.7, y: 28.4 },
                { label: "D", x: 23.4, y: 14.2 },
                { label: "E", x: 24.6, y: 33.0 },
                { label: "F", x: 26.2, y: 9.5 },
                { label: "G", x: 29.7, y: 19.0 },
                { label: "H", x: 33.1, y: 16.2 }
            ]
        },
        "夏勞尼荒野": {
            mapImage: "maps/夏勞尼荒野.png",
            mapNameEn: "Shaaloani",
            monsters: [
                { name: "艾海海陶瓦泡", nameEn: "Yehehetoaua'pyo", rank: "A" },
                { name: "凱海尼海亞麥尤伊", nameEn: "Keheniheyamewi", rank: "A" },
                { name: "山謝亞", nameEn: "Sansheya", rank: "S" },
                { name: "水晶化身之王", nameEn: "arch aethereater", rank: "SS" }
            ],
            aetherytes: [
                { name: "謝申內青磷泉", x: 15.7, y: 19.2 },
                { name: "美花黑澤恩", x: 27.7, y: 10.1 },
                { name: "胡薩塔伊驛鎮", x: 29.1, y: 30.8 }
            ],
            points: [
                { label: "A", x: 9.0, y: 16.5 },
                { label: "B", x: 13.3, y: 13.3 },
                { label: "C", x: 21.7, y: 33.3 },
                { label: "D", x: 16.1, y: 8.3 },
                { label: "E", x: 22.1, y: 28.2 },
                { label: "F", x: 23.0, y: 18.8 },
                { label: "G", x: 25.1, y: 23.3 },
                { label: "H", x: 31.4, y: 23.2 },
                { label: "I", x: 34.3, y: 6.5 }
            ]
        },
        "遺產之地": {
            mapImage: "maps/遺產之地.png",
            mapNameEn: "Heritage Found",
            monsters: [
                { name: "海休瓦拉", nameEn: "Heshuala", rank: "A" },
                { name: "多變裝置", nameEn: "Urna variabilis", rank: "A" },
                { name: "先驅勇士阿提卡斯", nameEn: "Atticus the Primogenitor", rank: "S" },
                { name: "水晶化身之王", nameEn: "arch aethereater", rank: "SS" }
            ],
            aetherytes: [
                { name: "邊郊鎮", x: 17.1, y: 9.8 },
                { name: "雷轉質礦場", x: 17.1, y: 23.9 },
                { name: "亞斯拉尼站", x: 31.8, y: 25.6 }
            ],
            points: [
                { label: "A", x: 8.2, y: 33.4 },
                { label: "B", x: 14.5, y: 26.0 },
                { label: "C", x: 17.5, y: 20.4 },
                { label: "D", x: 24.1, y: 19.6 },
                { label: "E", x: 27.1, y: 13.7 },
                { label: "F", x: 27.4, y: 33.6 },
                { label: "H", x: 29.5, y: 29.8 },
                { label: "G", x: 29.6, y: 19.5 }
            ]
        },
        "憶想之地": {
            mapImage: "maps/憶想之地.png",
            mapNameEn: "Living Memory",
            monsters: [
                { name: "清掃者薩莉", nameEn: "Sally the sweeper", rank: "A" },
                { name: "貓眼", nameEn: "Cat's eye", rank: "A" },
                { name: "天氣預報機器人", nameEn: "The Forecaster", rank: "S" },
                { name: "水晶化身之王", nameEn: "arch aethereater", rank: "SS" }
            ],
            aetherytes: [
                { name: "風之節點", x: 16.4, y: 13.6 },
                { name: "憶之節點", x: 21.5, y: 37.5 },
                { name: "火之節點", x: 34.6, y: 15.8 }
            ],
            points: [
                { label: "A", x: 4.2, y: 28.8 },
                { label: "B", x: 5.0, y: 12.0 },
                { label: "C", x: 12.4, y: 37.7 },
                { label: "D", x: 12.8, y: 27.7 },
                { label: "E", x: 18.8, y: 20.2 },
                { label: "F", x: 26.9, y: 31.3 }
            ]
        }
    },
    // 可在下方擴充 6.0 ~ 4.0 的資料
    "6.0": {
        "迷津": {
            mapImage: "maps/迷津.png",
            mapNameEn: "Labyrinthos",
            monsters: [
                { name: "胡睹", nameEn: "Hulder", rank: "A" },
                { name: "斯圖希", nameEn: "Storsie", rank: "A" },
                { name: "布弗魯", nameEn: "Burfurlur the Canny", rank: "S" },
                { name: "克爾", nameEn: "Ker", rank: "SS" }
            ],
            aetherytes: [
                { name: "無路總部", x: 6.7, y: 27.6 },
                { name: "小薩雷安", x: 21.6, y: 20.4 },
                { name: "公堂保管院", x: 30.4, y: 12.0 }
            ],
            points: [
                { label: "A", x: 6, y: 33.9 },
                { label: "B", x: 10.5, y: 19.1 },
                { label: "C", x: 12.4, y: 35.5 },
                { label: "D", x: 16.5, y: 16.4 },
                { label: "E", x: 17.3, y: 9.5 },
                { label: "F", x: 19.7, y: 38.1 },
                { label: "G", x: 25.5, y: 25.5 },
                { label: "H", x: 30.3, y: 8.5 },
                { label: "I", x: 32.5, y: 26 },
                { label: "J", x: 34.4, y: 13.5 }
            ]
        },
        "薩維奈島": {
            mapImage: "maps/薩維奈島.png",
            mapNameEn: "Thavnair",
            monsters: [
                { name: "須羯裡婆", nameEn: "Sugriva", rank: "A" },
                { name: "尤蘭", nameEn: "Yilan", rank: "A" },
                { name: "頗胝迦", nameEn: "Sphatika", rank: "S" },
                { name: "克爾", nameEn: "Ker", rank: "SS" }
            ],
            aetherytes: [
                { name: "代米爾遺烈鄉", x: 10.9, y: 22.1 },
                { name: "新港", x: 25.4, y: 34.0 },
                { name: "波洛嘉護法村", x: 29.6, y: 16.6 }
            ],
            points: [
                { label: "A", x: 14.7, y: 12.1 },
                { label: "B", x: 18.4, y: 16.3 },
                { label: "C", x: 18.4, y: 23.5 },
                { label: "D", x: 18.7, y: 12 },
                { label: "E", x: 20.2, y: 30.9 },
                { label: "F", x: 26.4, y: 21 },
                { label: "G", x: 27.5, y: 25.9 },
                { label: "H", x: 29.6, y: 13.6 },
                { label: "I", x: 32.8, y: 20.5 }
            ]
        },
        "加雷馬": {
            mapImage: "maps/加雷馬.png",
            mapNameEn: "Garlemald",
            monsters: [
                { name: "黑楊樹精", nameEn: "Aegeiros", rank: "A" },
                { name: "密涅瓦", nameEn: "Minerva", rank: "A" },
                { name: "阿姆斯特朗", nameEn: "Armstrong", rank: "S" },
                { name: "克爾", nameEn: "Ker", rank: "SS" }
            ],
            aetherytes: [
                { name: "碎離營地", x: 13.3, y: 31.2 },
                { name: "第三站", x: 31.8, y: 17.9 }
            ],
            points: [
                { label: "A", x: 9.9, y: 11.7 },
                { label: "B", x: 12, y: 17.4 },
                { label: "C", x: 12.2, y: 12.9 },
                { label: "D", x: 15.8, y: 19.8 },
                { label: "E", x: 23.3, y: 25.6 },
                { label: "F", x: 27.4, y: 34.2 },
                { label: "G", x: 29, y: 20.9 },
                { label: "H", x: 32.5, y: 32.4 },
                { label: "I", x: 33, y: 21.9 }
            ]
        },
        "嘆息海": {
            mapImage: "maps/嘆息海.png",
            mapNameEn: "Mare Lamentorum",
            monsters: [
                { name: "慕斯公主", nameEn: "Mousse princess", rank: "A" },
                { name: "月面仙人刺女王", nameEn: "Lunatender queen", rank: "A" },
                { name: "沉思之物", nameEn: "Ruminator", rank: "S" },
                { name: "克爾", nameEn: "Ker", rank: "SS" }
            ],
            aetherytes: [
                { name: "淚灣", x: 10.0, y: 34.5 },
                { name: "最佳威兔洞", x: 21.5, y: 11.2 },
            ],
            points: [
                { label: "A", x: 10.7, y: 24.1 },
                { label: "B", x: 16.3, y: 29 },
                { label: "C", x: 17.3, y: 24.9 },
                { label: "D", x: 18.8, y: 21.8 },
                { label: "E", x: 21.5, y: 35 },
                { label: "F", x: 24.3, y: 23.3 },
                { label: "G", x: 24.5, y: 33.8 },
                { label: "H", x: 28.5, y: 26.7 },
                { label: "I", x: 30, y: 30 },
                { label: "J", x: 36.3, y: 27.4 }
            ]
        },
        "厄爾庇斯": {
            mapImage: "maps/厄爾庇斯.png",
            mapNameEn: "Elpis",
            monsters: [
                { name: "瓣齒鯊", nameEn: "Petalodus", rank: "A" },
                { name: "固蘭蓋奇", nameEn: "Gurangatch", rank: "A" },
                { name: "俄菲翁尼厄斯", nameEn: "Ophioneus", rank: "S" },
                { name: "克爾", nameEn: "Ker", rank: "SS" }
            ],
            aetherytes: [
                { name: "十二奇園", x: 8.6, y: 32.6 },
                { name: "創作者之家", x: 10.7, y: 17.5 },
                { name: "醒吾天側園", x: 24.4, y: 24.2 }
            ],
            points: [
                { label: "A", x: 7.1, y: 29.1 },
                { label: "B", x: 12.8, y: 9.9 },
                { label: "C", x: 12.9, y: 32.2 },
                { label: "D", x: 17.9, y: 30.2 },
                { label: "E", x: 18.5, y: 24.5 },
                { label: "F", x: 21.4, y: 13.6 },
                { label: "G", x: 21.7, y: 6 },
                { label: "H", x: 29.5, y: 27.7 },
                { label: "I", x: 32.7, y: 18.7 },
                { label: "J", x: 34, y: 10.9 },
                { label: "K", x: 34.4, y: 14.2 }
            ]
        },
        "天外天垓": {
            mapImage: "maps/天外天垓.png",
            mapNameEn: "Ultima Thule",
            monsters: [
                { name: "伊塔總領", nameEn: "Arch-eta", rank: "A" },
                { name: "凡艾爾", nameEn: "Fan ail", rank: "A" },
                { name: "狹縫", nameEn: "Narrow-rift", rank: "S" },
                { name: "克爾", nameEn: "Ker", rank: "SS" }
            ],
            aetherytes: [
                { name: "半途終旅", x: 10.5, y: 27.0 },
                { name: "異亞村落", x: 22.7, y: 8.6 },
                { name: "奧米克戎基地", x: 31.2, y: 28.5 }
            ],
            points: [
                { label: "A", x: 8.5, y: 20.6 },
                { label: "B", x: 11.8, y: 22 },
                { label: "C", x: 13.3, y: 10.6 },
                { label: "D", x: 15.5, y: 36.2 },
                { label: "E", x: 16.2, y: 26.2 },
                { label: "F", x: 17.8, y: 30.4 },
                { label: "G", x: 19.5, y: 9.8 },
                { label: "H", x: 21.8, y: 33.9 },
                { label: "I", x: 28.3, y: 12.5 }
            ]
        }
    }
};
