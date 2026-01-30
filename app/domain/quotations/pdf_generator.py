from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from typing import List, Dict, Any
from datetime import datetime
import os


class QuotationPDFGenerator:
    """Generate PDF quotations with Chinese support"""
    
    def __init__(self):
        # Try to register Chinese fonts (optional, fallback to default if not available)
        try:
            # You may need to provide actual font files
            # pdfmetrics.registerFont(TTFont('SimSun', 'simsun.ttc'))
            pass
        except:
            pass
    
    def generate(
        self,
        quotation: Dict[str, Any],
        items: List[Dict[str, Any]],
        agency_name: str = "智旅旅游有限公司"
    ) -> BytesIO:
        """
        Generate PDF quotation
        
        Args:
            quotation: Quotation data
            items: List of quotation items
            agency_name: Agency name
            
        Returns:
            BytesIO buffer containing PDF data
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#334155'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#475569')
        )
        
        # Title
        story.append(Paragraph("旅游产品报价单", title_style))
        story.append(Spacer(1, 0.5*cm))
        
        # Header info
        header_data = [
            ["报价单编号:", quotation.get('id', 'N/A')],
            ["客户名称:", quotation.get('customer_name', 'N/A')],
            ["联系方式:", quotation.get('customer_contact', 'N/A')],
            ["生成日期:", datetime.now().strftime('%Y-%m-%d %H:%M')],
            ["有效期:", "24小时"]
        ]
        
        header_table = Table(header_data, colWidths=[4*cm, 12*cm])
        header_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#0f172a')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(header_table)
        story.append(Spacer(1, 1*cm))
        
        # Items section
        story.append(Paragraph("产品明细", heading_style))
        story.append(Spacer(1, 0.3*cm))
        
        # Items table
        items_data = [["序号", "产品名称", "类型", "数量", "单价", "小计"]]
        
        for idx, item in enumerate(items, 1):
            snapshot = item.get('snapshot', {})
            items_data.append([
                str(idx),
                snapshot.get('sku_name', 'N/A')[:30],
                snapshot.get('sku_type', 'N/A'),
                str(item.get('quantity', 1)),
                f"¥{float(item.get('unit_price', 0)):,.2f}",
                f"¥{float(item.get('subtotal', 0)):,.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[1.5*cm, 7*cm, 2*cm, 2*cm, 3*cm, 3*cm])
        items_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        story.append(items_table)
        story.append(Spacer(1, 1*cm))
        
        # Summary section
        total_amount = float(quotation.get('total_amount', 0))
        discount_amount = float(quotation.get('discount_amount', 0))
        final_amount = float(quotation.get('final_amount', 0))
        
        summary_data = [
            ["产品总计:", f"¥{total_amount:,.2f}"],
            ["优惠金额:", f"-¥{discount_amount:,.2f}"],
            ["最终金额:", f"¥{final_amount:,.2f}"]
        ]
        
        summary_table = Table(summary_data, colWidths=[14*cm, 4*cm])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -2), 11),
            ('FONTSIZE', (0, -1), (-1, -1), 14),
            ('TEXTCOLOR', (0, 0), (-1, -2), colors.HexColor('#475569')),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#2563eb')),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#2563eb')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 1*cm))
        
        # Notes
        if quotation.get('notes'):
            story.append(Paragraph("备注说明", heading_style))
            story.append(Paragraph(quotation['notes'], normal_style))
            story.append(Spacer(1, 0.5*cm))
        
        # Footer
        story.append(Spacer(1, 1*cm))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#94a3b8'),
            alignment=TA_CENTER
        )
        
        story.append(Paragraph(f"本报价单由 {agency_name} 提供", footer_style))
        story.append(Paragraph("感谢您的信任与支持！", footer_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return buffer
