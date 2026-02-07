#!/usr/bin/env python3
"""
敦煌宾馆复杂酒店数据导入脚本
演示如何使用新的HotelAttrs schema导入包含多房间类型、餐饮、会议室的酒店数据
"""

import json
from decimal import Decimal

# 敦煌宾馆完整数据
DUNHUANG_HOTEL_DATA = {
    "sku_name": "敦煌宾馆",
    "sku_type": "hotel",
    "owner_type": "private",
    "supplier_name": "敦煌宾馆有限责任公司",
    "destination_country": "中国",
    "destination_city": "敦煌",
    "description": "敦煌宾馆有限责任公司是一家拥有40多年历史的园林式四星级文化主题国宾馆，总体分为南区和北区，占地面积32000平方米，拥有1号楼、2号楼、8号楼三座主体建筑，地理位置优越环境幽雅，临近全国名优小吃广场沙洲夜市，交通便利。拥有196间不同档次风格的客房，可同时容纳1000人就餐，创制的\"敦煌宴\"曾获中华美食最高奖\"金鼎奖\"。",
    "tags": ["园林式", "文化主题", "国宾馆", "敦煌宴", "会议", "商务", "自驾", "研学"],
    "highlights": [
        "40多年历史",
        "园林式四星级文化主题国宾馆",
        "196间不同档次风格的客房",
        "可同时容纳1000人就餐",
        "敦煌宴获中华美食最高奖"
    ],
    "attrs": {
        "hotel_name": "敦煌宾馆",
        "star_rating": "四星级",
        "address": "中国.甘肃.敦煌阳关中路151号",
        "contact_info": {
            "phone": "(0937)8859268、(0937)8859368",
            "fax": "(0937)8822195",
            "email": "1070064513@qq.com",
            "website": "http://www.dunhuanghotel.com",
            "wechat": "dunhuangbinguan"
        },
        "facilities": [
            "中餐",
            "西餐",
            "咖啡休闲区（敦煌文创旗舰店）",
            "茶社",
            "沉浸式园林体验区（阅莲厅）"
        ],
        "room_types": [
            {
                "building": "2号楼",
                "room_type_name": "豪华套房",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 1480, "currency": "CNY"},
                    {"season": "平季", "daily_price": 1080, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 880, "currency": "CNY"}
                ]
            },
            {
                "building": "2号楼",
                "room_type_name": "豪华单间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 980, "currency": "CNY"},
                    {"season": "平季", "daily_price": 680, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 580, "currency": "CNY"}
                ]
            },
            {
                "building": "2号楼",
                "room_type_name": "豪华标间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 680, "currency": "CNY"},
                    {"season": "平季", "daily_price": 480, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 380, "currency": "CNY"}
                ]
            },
            {
                "building": "2号楼",
                "room_type_name": "商务套房",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 980, "currency": "CNY"},
                    {"season": "平季", "daily_price": 680, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 580, "currency": "CNY"}
                ]
            },
            {
                "building": "2号楼",
                "room_type_name": "商务单间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 520, "currency": "CNY"},
                    {"season": "平季", "daily_price": 380, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 280, "currency": "CNY"}
                ]
            },
            {
                "building": "2号楼",
                "room_type_name": "商务标间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 520, "currency": "CNY"},
                    {"season": "平季", "daily_price": 380, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 280, "currency": "CNY"}
                ]
            },
            {
                "building": "8号楼",
                "room_type_name": "豪华套房",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 1280, "currency": "CNY"},
                    {"season": "平季", "daily_price": 980, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 780, "currency": "CNY"}
                ]
            },
            {
                "building": "8号楼",
                "room_type_name": "豪华单间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 680, "currency": "CNY"},
                    {"season": "平季", "daily_price": 480, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 380, "currency": "CNY"}
                ]
            },
            {
                "building": "8号楼",
                "room_type_name": "豪华标间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 680, "currency": "CNY"},
                    {"season": "平季", "daily_price": 480, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 380, "currency": "CNY"}
                ]
            },
            {
                "building": "8号楼",
                "room_type_name": "商务套房",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 980, "currency": "CNY"},
                    {"season": "平季", "daily_price": 680, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 580, "currency": "CNY"}
                ]
            },
            {
                "building": "8号楼",
                "room_type_name": "商务单间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 520, "currency": "CNY"},
                    {"season": "平季", "daily_price": 380, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 280, "currency": "CNY"}
                ]
            },
            {
                "building": "8号楼",
                "room_type_name": "商务标间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 520, "currency": "CNY"},
                    {"season": "平季", "daily_price": 380, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 280, "currency": "CNY"}
                ]
            },
            {
                "building": "1号楼",
                "room_type_name": "总统套间",
                "include_breakfast": True,
                "pricing": [
                    {"season": "旺季", "daily_price": 16800, "currency": "CNY"},
                    {"season": "平季", "daily_price": 12800, "currency": "CNY"},
                    {"season": "淡季", "daily_price": 9800, "currency": "CNY"}
                ]
            }
        ],
        "dining_options": [
            {
                "meal_type": "早餐",
                "pricing": [
                    {"group_size": "10人以上", "price_per_person": 40},
                    {"group_size": "6人以上", "price_per_person": 40},
                    {"group_size": "2-5人", "price_per_person": 40},
                    {"group_size": "1人/份", "price_per_person": 40}
                ]
            },
            {
                "meal_type": "午餐",
                "pricing": [
                    {"group_size": "10人以上", "price_per_person": 50},
                    {"group_size": "6人以上", "price_per_person": 60},
                    {"group_size": "2-5人", "price_per_person": 80},
                    {"group_size": "1人/份", "price_per_person": 100}
                ]
            },
            {
                "meal_type": "晚餐",
                "pricing": [
                    {"group_size": "10人以上", "price_per_person": 50},
                    {"group_size": "6人以上", "price_per_person": 60},
                    {"group_size": "2-5人", "price_per_person": 80},
                    {"group_size": "1人/份", "price_per_person": 100}
                ]
            },
            {
                "meal_type": "阅莲厅（沉浸式园林体验区）早餐",
                "pricing": [
                    {"group_size": "标准", "price_per_person": 68}
                ]
            },
            {
                "meal_type": "阅莲厅（沉浸式园林体验区）午餐",
                "pricing": [
                    {"group_size": "标准", "price_per_person": 180}
                ]
            },
            {
                "meal_type": "阅莲厅（沉浸式园林体验区）晚餐",
                "pricing": [
                    {"group_size": "标准", "price_per_person": 180}
                ]
            },
            {
                "meal_type": "2#楼国宴厅早餐",
                "pricing": [
                    {"group_size": "标准", "price_per_person": 100}
                ]
            },
            {
                "meal_type": "2#楼国宴厅午餐",
                "pricing": [
                    {"group_size": "标准", "price_per_person": 400, "notes": "400元/位起"}
                ]
            },
            {
                "meal_type": "2#楼国宴厅晚餐",
                "pricing": [
                    {"group_size": "标准", "price_per_person": 400, "notes": "400元/位起"}
                ]
            },
            {
                "meal_type": "敦煌宴",
                "pricing": [
                    {"group_size": "10人以内包场", "price_per_person": 8980, "notes": "包场价"},
                    {"group_size": "20人以内包场", "price_per_person": 18860, "notes": "包场价"},
                    {"group_size": "20人以上桌餐", "price_per_person": 498},
                    {"group_size": "20人以上分餐", "price_per_person": 598}
                ]
            }
        ],
        "conference_rooms": [
            {
                "room_name": "会议室（多功能厅）",
                "area_sqm": 426,
                "capacity": "大型会议、论坛、会见",
                "function": "大型会议、论坛、会见",
                "pricing": [
                    {"duration": "全天", "price": 10000},
                    {"duration": "半天", "price": 6000}
                ]
            },
            {
                "room_name": "会议室（飞天厅）",
                "area_sqm": 220,
                "capacity": "中型会议",
                "function": "中型会议",
                "pricing": [
                    {"duration": "全天", "price": 5000},
                    {"duration": "半天", "price": 3000}
                ]
            },
            {
                "room_name": "会议室（悬泉厅）",
                "area_sqm": 96,
                "capacity": "小型会议",
                "function": "小型会议",
                "pricing": [
                    {"duration": "全天", "price": 2600},
                    {"duration": "半天", "price": 1200}
                ]
            },
            {
                "room_name": "小型会议室",
                "area_sqm": 65,
                "capacity": "会见、座谈",
                "function": "会见、座谈",
                "pricing": [
                    {"duration": "全天", "price": 1200},
                    {"duration": "半天", "price": 600}
                ]
            },
            {
                "room_name": "古柳生态园林会场",
                "area_sqm": 120,
                "capacity": "雅集、培训、座谈",
                "function": "雅集、培训、座谈",
                "pricing": [
                    {"duration": "全天", "price": 6000},
                    {"duration": "半天", "price": 3000}
                ]
            }
        ],
        "season_definitions": {
            "peak": "7月1日至10月31日",
            "regular": "4月1日至6月30日",
            "low": "11月1日至次年3月31日"
        },
        "booking_notes": "以上协议价格只允许线下团队，不允许线上售卖，如果发现线上售卖的情况，立刻停止合作。会场使用时间说明：四小时以内为半天，超过四小时为全天。团队房价及大型会议活动请与宾馆销售部接洽。"
    }
}


def print_import_payload():
    """打印导入负载，用于API调用"""
    print("=" * 80)
    print("敦煌宾馆导入数据结构")
    print("=" * 80)
    print("\n以下是用于导入的完整JSON负载：\n")
    print(json.dumps(DUNHUANG_HOTEL_DATA, indent=2, ensure_ascii=False))
    print("\n" + "=" * 80)
    print("使用方式：")
    print("=" * 80)
    print("""
1. 通过前端"智能导入"功能上传敦煌宾馆数据
2. 系统会解析并提取关键信息
3. 确认导入时，使用上述结构化数据
4. 系统会自动创建SKU并存储所有复杂信息

API端点示例：
POST /api/imports/confirm
{
    "task_id": "IMPORT-xxxxx",
    "extracted_fields": <上述attrs内容>,
    "sku_type": "hotel"
}

或直接创建SKU：
POST /api/skus
<上述完整数据>
    """)


if __name__ == "__main__":
    print_import_payload()
