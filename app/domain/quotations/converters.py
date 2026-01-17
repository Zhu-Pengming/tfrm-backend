from app.infra.db import SKU
from typing import Dict, Any
from decimal import Decimal


class SKUToQuoteItemConverter:
    @staticmethod
    def convert(sku: SKU) -> Dict[str, Any]:
        base_snapshot = {
            "sku_id": sku.id,
            "sku_name": sku.sku_name,
            "sku_type": sku.sku_type,
            "destination_city": sku.destination_city,
            "destination_country": sku.destination_country,
            "tags": sku.tags,
            "include_items": sku.include_items,
            "exclude_items": sku.exclude_items,
            "media": sku.media,
            "supplier_name": sku.supplier_name,
        }
        
        if sku.sku_type == "hotel":
            return SKUToQuoteItemConverter._convert_hotel(sku, base_snapshot)
        elif sku.sku_type == "car":
            return SKUToQuoteItemConverter._convert_car(sku, base_snapshot)
        elif sku.sku_type == "itinerary":
            return SKUToQuoteItemConverter._convert_itinerary(sku, base_snapshot)
        elif sku.sku_type == "guide":
            return SKUToQuoteItemConverter._convert_guide(sku, base_snapshot)
        elif sku.sku_type == "restaurant":
            return SKUToQuoteItemConverter._convert_restaurant(sku, base_snapshot)
        elif sku.sku_type == "ticket":
            return SKUToQuoteItemConverter._convert_ticket(sku, base_snapshot)
        elif sku.sku_type == "activity":
            return SKUToQuoteItemConverter._convert_activity(sku, base_snapshot)
        else:
            return base_snapshot
    
    @staticmethod
    def _convert_hotel(sku: SKU, base: Dict[str, Any]) -> Dict[str, Any]:
        attrs = sku.attrs
        base.update({
            "title": f"{attrs.get('hotel_name', sku.sku_name)} - {attrs.get('room_type_name', '')}",
            "highlights": [
                f"房型: {attrs.get('room_type_name')}",
                f"床型: {attrs.get('bed_type', '标准')}",
                f"面积: {attrs.get('room_area')}㎡" if attrs.get('room_area') else None,
                "含早餐" if attrs.get('include_breakfast') else "不含早餐",
            ],
            "unit": "晚",
            "unit_price": attrs.get('daily_sell_price', 0),
            "address": attrs.get('address'),
        })
        base["highlights"] = [h for h in base["highlights"] if h]
        return base
    
    @staticmethod
    def _convert_car(sku: SKU, base: Dict[str, Any]) -> Dict[str, Any]:
        attrs = sku.attrs
        base.update({
            "title": f"{attrs.get('car_type', sku.sku_name)} - {attrs.get('service_mode', '')}",
            "highlights": [
                f"座位数: {attrs.get('seats')}座",
                f"服务时长: {attrs.get('service_hours')}小时" if attrs.get('service_hours') else None,
                f"司机语言: {', '.join(attrs.get('driver_language', []))}",
            ],
            "unit": "车/天",
            "unit_price": attrs.get('sell_price', 0),
        })
        base["highlights"] = [h for h in base["highlights"] if h]
        return base
    
    @staticmethod
    def _convert_itinerary(sku: SKU, base: Dict[str, Any]) -> Dict[str, Any]:
        attrs = sku.attrs
        base.update({
            "title": attrs.get('itinerary_name', sku.sku_name),
            "highlights": [
                f"{attrs.get('days')}天{attrs.get('nights')}晚",
                f"出发地: {attrs.get('depart_city')}",
                attrs.get('highlight'),
            ],
            "unit": "人",
            "unit_price": attrs.get('adult_price', 0),
        })
        base["highlights"] = [h for h in base["highlights"] if h]
        return base
    
    @staticmethod
    def _convert_guide(sku: SKU, base: Dict[str, Any]) -> Dict[str, Any]:
        attrs = sku.attrs
        base.update({
            "title": f"{attrs.get('guide_name', sku.sku_name)} - {attrs.get('grade', '导游')}",
            "highlights": [
                f"语言: {', '.join(attrs.get('languages', []))}",
                f"擅长: {', '.join(attrs.get('expertise_tags', []))}",
                f"服务城市: {attrs.get('service_city')}",
            ],
            "unit": "天",
            "unit_price": attrs.get('daily_sell_price', 0),
        })
        base["highlights"] = [h for h in base["highlights"] if h]
        return base
    
    @staticmethod
    def _convert_restaurant(sku: SKU, base: Dict[str, Any]) -> Dict[str, Any]:
        attrs = sku.attrs
        base.update({
            "title": f"{attrs.get('restaurant_name', sku.sku_name)} - {attrs.get('meal_type', '')}",
            "highlights": [
                f"菜系: {attrs.get('cuisine_type')}",
                f"位置: {attrs.get('location')}",
                attrs.get('set_menu_desc'),
            ],
            "unit": "人",
            "unit_price": attrs.get('per_person_price', 0),
        })
        base["highlights"] = [h for h in base["highlights"] if h]
        return base
    
    @staticmethod
    def _convert_ticket(sku: SKU, base: Dict[str, Any]) -> Dict[str, Any]:
        attrs = sku.attrs
        base.update({
            "title": f"{attrs.get('attraction_name', sku.sku_name)} - {attrs.get('ticket_type', '')}",
            "highlights": [
                f"入园方式: {attrs.get('entry_method')}",
                f"有效期: {attrs.get('valid_days')}天" if attrs.get('valid_days') else None,
                f"游玩时间: {attrs.get('visit_time_range')}",
            ],
            "unit": "张",
            "unit_price": attrs.get('sell_price', 0),
        })
        base["highlights"] = [h for h in base["highlights"] if h]
        return base
    
    @staticmethod
    def _convert_activity(sku: SKU, base: Dict[str, Any]) -> Dict[str, Any]:
        attrs = sku.attrs
        base.update({
            "title": f"{attrs.get('activity_name', sku.sku_name)}",
            "highlights": [
                f"类型: {attrs.get('category')}",
                f"时长: {attrs.get('duration_hours')}小时" if attrs.get('duration_hours') else None,
                f"语言: {', '.join(attrs.get('language_service', []))}",
                f"难度: {attrs.get('difficulty_level')}",
            ],
            "unit": "人",
            "unit_price": attrs.get('sell_price', 0),
        })
        base["highlights"] = [h for h in base["highlights"] if h]
        return base
