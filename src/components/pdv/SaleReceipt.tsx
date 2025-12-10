import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ReceiptData {
  saleNumber: string;
  date: Date;
  customer?: {
    company_name: string;
    cnpj?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

interface SaleReceiptProps {
  data: ReceiptData;
}

const SaleReceipt = forwardRef<HTMLDivElement, SaleReceiptProps>(({ data }, ref) => {
  const paymentMethodLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao: 'Cartão',
    pix: 'PIX',
    outros: 'Outros'
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div 
      ref={ref} 
      className="bg-white text-black p-6 w-[300px] mx-auto font-mono text-sm"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-4 mb-4">
        <h1 className="text-lg font-bold">ESTOFADOS</h1>
        <p className="text-xs mt-1">Fábrica de Sofás</p>
        <p className="text-xs text-gray-600 mt-2">
          {format(data.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* Sale Number */}
      <div className="text-center border-b border-dashed border-gray-400 pb-4 mb-4">
        <p className="text-xs text-gray-600">COMPROVANTE DE VENDA</p>
        <p className="font-bold text-base">{data.saleNumber}</p>
      </div>

      {/* Customer Info */}
      {data.customer && (
        <div className="border-b border-dashed border-gray-400 pb-4 mb-4">
          <p className="text-xs text-gray-600 mb-1">CLIENTE:</p>
          <p className="font-semibold">{data.customer.company_name}</p>
          {data.customer.cnpj && (
            <p className="text-xs">CNPJ: {data.customer.cnpj}</p>
          )}
          {data.customer.phone && (
            <p className="text-xs">Tel: {data.customer.phone}</p>
          )}
          {(data.customer.city || data.customer.state) && (
            <p className="text-xs">
              {[data.customer.city, data.customer.state].filter(Boolean).join(' - ')}
            </p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="border-b border-dashed border-gray-400 pb-4 mb-4">
        <p className="text-xs text-gray-600 mb-2">ITENS:</p>
        {data.items.map((item, index) => (
          <div key={index} className="mb-2">
            <p className="font-medium text-xs truncate">{item.product_name}</p>
            <div className="flex justify-between text-xs">
              <span>{item.quantity}x {formatCurrency(item.unit_price)}</span>
              <span className="font-semibold">{formatCurrency(item.total_price)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-b border-dashed border-gray-400 pb-4 mb-4">
        <div className="flex justify-between text-xs">
          <span>Subtotal:</span>
          <span>{formatCurrency(data.subtotal)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between text-xs text-green-700">
            <span>Desconto:</span>
            <span>-{formatCurrency(data.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-gray-300">
          <span>TOTAL:</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="text-center border-b border-dashed border-gray-400 pb-4 mb-4">
        <p className="text-xs text-gray-600">FORMA DE PAGAMENTO:</p>
        <p className="font-bold">{paymentMethodLabels[data.paymentMethod] || data.paymentMethod}</p>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="border-b border-dashed border-gray-400 pb-4 mb-4">
          <p className="text-xs text-gray-600">OBSERVAÇÕES:</p>
          <p className="text-xs">{data.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-600">
        <p>Obrigado pela preferência!</p>
        <p className="mt-1">Volte sempre</p>
        <div className="mt-4 pt-2 border-t border-gray-300">
          <p className="text-[10px]">Este documento não possui valor fiscal</p>
        </div>
      </div>
    </div>
  );
});

SaleReceipt.displayName = 'SaleReceipt';

export default SaleReceipt;
