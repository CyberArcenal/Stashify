// src/renderer/pages/sales/components/SalesFormDialog/hooks/useSalesForm.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { dialogs } from "../../../../../utils/dialogs";
import type {
  OrderCreateData,
  OrderUpdateData,
  Order,
} from "../../../../../api/core/order";
import orderAPI from "../../../../../api/core/order";
import customerAPI from "../../../../../api/core/customer";
import productAPI from "../../../../../api/core/product";
import productVariantAPI from "../../../../../api/core/productVariant";
import { useSalesSettings } from "../../../../../utils/configUtils/sales";
import type { FormData, OrderItemForm } from "../types";
import type { Tax } from "../../../../../api/core/tax";

export const useSalesForm = (
  mode: "add" | "edit",
  orderId: number | null,
  initialData: Partial<Order> | null,
  onSuccess: () => void,
  onClose: () => void,
) => {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [customerBalance, setCustomerBalance] = useState(0);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false); // loading state for edit fetch

  const { loyalty_points_enabled } = useSalesSettings();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      order_number: "",
      customerId: null,
      notes: "",
      items: [],
      subtotal: 0,
      tax_amount: 0,
      totalBeforePoints: 0,
      total: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items");
  const customerId = watch("customerId");
  const subtotal = watch("subtotal");
  const tax_amount = watch("tax_amount");
  const totalBeforePoints = watch("totalBeforePoints");

  const finalTotal = Math.max(
    0,
    totalBeforePoints - (usePoints ? pointsAmount : 0),
  );

  const recalcTotals = useCallback(
    (currentItems: OrderItemForm[]) => {
      const subtotal = currentItems.reduce(
        (sum, item) => sum + (item.lineNetTotal || 0),
        0,
      );
      const tax_amount = currentItems.reduce(
        (sum, item) => sum + (item.lineTaxTotal || 0),
        0,
      );
      const totalBeforePoints = currentItems.reduce(
        (sum, item) => sum + (item.lineGrossTotal || 0),
        0,
      );
      setValue("subtotal", subtotal);
      setValue("tax_amount", tax_amount);
      setValue("totalBeforePoints", totalBeforePoints);
    },
    [setValue],
  );

  useEffect(() => {
    setValue("total", finalTotal);
  }, [finalTotal, setValue]);

  useEffect(() => {
    if (!customerId) {
      setCustomerBalance(0);
      setUsePoints(false);
      setPointsAmount(0);
      return;
    }

    const fetchCustomer = async () => {
      setLoadingCustomer(true);
      try {
        const res = await customerAPI.getById(customerId);
        if (res.status) {
          const newBalance = res.data.loyaltyPointsBalance;
          setCustomerBalance(newBalance);
          // Adjust points if needed
          if (newBalance === 0) {
            setUsePoints(false);
            setPointsAmount(0);
          } else {
            setPointsAmount((prev) => Math.min(prev, newBalance));
          }
        }
      } catch (err) {
        console.error("Failed to fetch customer", err);
      } finally {
        setLoadingCustomer(false);
      }
    };
    fetchCustomer();
  }, [customerId]);

  // ========== EDIT MODE: Fetch full order from API ==========
  useEffect(() => {
    if (mode === "edit" && orderId) {
      const fetchOrder = async () => {
        setLoadingOrder(true);
        try {
          const res = await orderAPI.getById(orderId);
          if (res.status && res.data) {
            const order = res.data;
            const formItems: OrderItemForm[] = (order.items || []).map(
              (item) => ({
                productId: item.product?.id || null,
                productName: item.product?.name,
                variantId: item.variant?.id || null,
                variantName: item.variant?.name,
                warehouseId: item.warehouse?.id || null,
                warehouseName: item.warehouse?.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount_amount || 0,
                lineNetTotal: item.line_net_total,
                // taxes will be fetched separately
              }),
            );

            reset({
              order_number: order.order_number,
              customerId: order.customer?.id || null,
              customerName: order.customer?.name,
              notes: order.notes || "",
              items: formItems,
              subtotal: order.subtotal,
              tax_amount: order.tax_amount,
              totalBeforePoints: order.total, // backend already computed total before points? careful.
              total: order.total,
            });

            setUsePoints(order.usedLoyalty || false);
            setPointsAmount(order.loyaltyRedeemed || 0);

            // Fetch taxes for each item (if product exists)
            setTimeout(() => {
              formItems.forEach((item, index) => {
                if (item.productId) {
                  loadProductTaxes(item.productId, index);
                }
              });
            }, 0);
          } else {
            throw new Error(res.message || "Failed to load order");
          }
        } catch (err) {
          console.error("Error loading order for edit:", err);
          dialogs.error("Failed to load order details. Please try again.");
          onClose();
        } finally {
          setLoadingOrder(false);
        }
      };
      fetchOrder();
    } else if (mode === "add") {
      // Reset to default values for add mode
      reset({
        order_number: `ORD-${Date.now()}`,
        customerId: null,
        notes: "",
        items: [],
        subtotal: 0,
        tax_amount: 0,
        totalBeforePoints: 0,
        total: 0,
      });
      setUsePoints(false);
      setPointsAmount(0);
    }
  }, [mode, orderId]); // dependency on mode and orderId only (not initialData)

  const handleUsePointsChange = (checked: boolean) => {
    setUsePoints(checked);
    if (!checked) setPointsAmount(0);
  };

  const handleUseAllPoints = () => {
    const maxPoints = Math.min(customerBalance, totalBeforePoints);
    setPointsAmount(maxPoints);
  };

  const pointsError =
    usePoints && pointsAmount > customerBalance
      ? "Insufficient points"
      : usePoints && pointsAmount > totalBeforePoints
        ? "Points exceed total"
        : "";

  const computeItemTaxes = (
    lineNetTotal: number,
    taxes: Tax[] = [],
    quantity: number,
  ) => {
    let lineTaxTotal = 0;
    const taxBreakdown = taxes.map((tax) => {
      let amount = 0;
      if (tax.type === "percentage") {
        amount = lineNetTotal * (tax.rate / 100);
      } else {
        amount = tax.rate * quantity;
      }
      amount = Math.round(amount * 100) / 100;
      lineTaxTotal += amount;
      return {
        taxId: tax.id,
        name: tax.name,
        rate: tax.rate,
        type: tax.type,
        amount,
      };
    });
    lineTaxTotal = Math.round(lineTaxTotal * 100) / 100;
    const lineGrossTotal = lineNetTotal + lineTaxTotal;
    return { taxBreakdown, lineTaxTotal, lineGrossTotal };
  };

  const updateItem = (index: number, updates: Partial<OrderItemForm>) => {
    const currentItems = getValues("items");
    const current = currentItems[index];
    const updated = { ...current, ...updates };

    const quantity = Number(updated.quantity) || 1;
    const unit_price = Number(updated.unit_price) || 0;
    const discount = Number(updated.discount) || 0;
    const lineSubtotal = quantity * unit_price;
    const cappedDiscount = Math.min(discount, lineSubtotal);
    const lineNetTotal = lineSubtotal - cappedDiscount;

    updated.quantity = quantity;
    updated.unit_price = unit_price;
    updated.discount = cappedDiscount;
    updated.lineNetTotal = lineNetTotal;

    if (updated.taxes && updated.taxes.length > 0) {
      const { taxBreakdown, lineTaxTotal, lineGrossTotal } = computeItemTaxes(
        lineNetTotal,
        updated.taxes,
        quantity,
      );
      updated.taxBreakdown = taxBreakdown;
      updated.lineTaxTotal = lineTaxTotal;
      updated.lineGrossTotal = lineGrossTotal;
    } else {
      updated.taxBreakdown = [];
      updated.lineTaxTotal = 0;
      updated.lineGrossTotal = lineNetTotal;
    }

    setValue(`items.${index}`, updated);
    const newItems = [...currentItems];
    newItems[index] = updated;
    recalcTotals(newItems);
  };

  const loadProductTaxes = async (productId: number, index: number) => {
    try {
      const res = await productAPI.getById(productId);
      if (res.status && res.data) {
        updateItem(index, { taxes: res.data.taxes });
      }
    } catch (err) {
      console.error("Failed to fetch product taxes", err);
    }
  };

  const loadVariantTaxes = async (variantId: number, index: number) => {
    try {
      const res = await productVariantAPI.getById(variantId);
      if (res.status && res.data) {
        updateItem(index, { taxes: res.data.taxes });
      }
    } catch (err) {
      console.error("Failed to fetch variant taxes", err);
    }
  };

  const addItem = () => {
    append({
      productId: null,
      variantId: null,
      warehouseId: null,
      quantity: 1,
      unit_price: 0,
      discount: 0,
      lineNetTotal: 0,
    });
    setExpandedItems((prev) => [...prev, fields.length]);
  };

  const removeItem = (index: number) => {
    remove(index);
    setTimeout(() => {
      const currentItems = getValues("items");
      recalcTotals(currentItems);
    }, 0);
    setExpandedItems((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    );
  };

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const expandAll = () => setExpandedItems(fields.map((_, i) => i));
  const collapseAll = () => setExpandedItems([]);

  const onSubmit = async (data: FormData) => {
    if (
      !(await dialogs.confirm({
        title: "Submit",
        message: "Are you sure you want to submit this form?",
      }))
    )
      return;

    try {
      if (data.items.length === 0)
        throw new Error("At least one item is required");
      for (let i = 0; i < data.items.length; i++) {
        if (!data.items[i].productId)
          throw new Error(`Item ${i + 1}: Product is required`);
      }

      const payload: OrderCreateData = {
        order_number: data.order_number,
        customerId: data.customerId || undefined,
        notes:
          data.notes ||
          (usePoints ? `Points used: ${pointsAmount}` : undefined),
        items: data.items.map((item) => ({
          productId: item.productId!,
          variantId: item.variantId || undefined,
          warehouseId: item.warehouseId || undefined,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          discount: item.discount,
        })),
        usedLoyalty: usePoints,
        loyaltyRedeemed: usePoints ? pointsAmount : 0,
        usedDiscount: data.items.some((item) => item.discount > 0),
        totalDiscount: data.items.reduce(
          (sum, item) => sum + (item.discount || 0),
          0,
        ),
        usedVoucher: false,
        voucherCode: undefined,
      };

      if (mode === "add") {
        await orderAPI.create(payload);
        dialogs.success("Order created successfully");
      } else {
        if (!orderId) throw new Error("Order ID missing");
        await orderAPI.update(orderId, payload as OrderUpdateData);
        dialogs.success("Order updated successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      dialogs.error(err.message || "Failed to save order");
    }
  };

  return {
    register,
    handleSubmit,
    control,
    setValue,
    errors,
    isSubmitting,
    fields,
    items,
    customerId,
    subtotal,
    tax_amount,
    totalBeforePoints,
    finalTotal,
    usePoints,
    pointsAmount,
    customerBalance,
    loadingCustomer,
    loadingOrder, // expose loading state for UI
    pointsError,
    loyalty_points_enabled,
    handleUsePointsChange,
    handleUseAllPoints,
    expandedItems,
    addItem,
    removeItem,
    toggleExpand,
    expandAll,
    collapseAll,
    updateItem,
    loadProductTaxes,
    loadVariantTaxes,
    setPointsAmount,
    mode,
    onSubmit,
  };
};
