-- Supabase Function to handle order cancellation with automatic stock restoration
-- This function restores inventory when an order is cancelled

create or replace function public.cancel_order(
  p_order_id bigint,
  p_cancellation_reason text
)
returns json
language plpgsql
security definer
as $$
declare
  v_order record;
  v_product record;
  v_size_record record;
  v_platform_field text;
begin
  -- Get the order details
  select * into v_order from public.orders where id = p_order_id;
  
  if v_order is null then
    return json_build_object('success', false, 'message', 'Order not found');
  end if;
  
  if v_order.status = 'Cancelled' then
    return json_build_object('success', false, 'message', 'Order is already cancelled');
  end if;
  
  -- Get the product details
  select * into v_product from public.products where id = v_order.product_id;
  
  if v_product is null then
    return json_build_object('success', false, 'message', 'Product not found');
  end if;
  
  -- Restore quantity in sizes table
  select * into v_size_record from public.sizes where product_id = v_order.product_id;
  
  if v_size_record is not null then
    update public.sizes 
    set remaining_quantity = remaining_quantity + v_order.quantity
    where product_id = v_order.product_id;
  end if;
  
  -- Update product's platform-specific order counts (reverse the deduction)
  if v_order.platform = 'facebook' then
    update public.products 
    set ordered_from_facebook = greatest(0, ordered_from_facebook - v_order.quantity)
    where id = v_order.product_id;
  elsif v_order.platform = 'instagram' then
    update public.products 
    set ordered_from_instagram = greatest(0, ordered_from_instagram - v_order.quantity)
    where id = v_order.product_id;
  end if;
  
  -- Update order status
  update public.orders 
  set 
    status = 'Cancelled',
    cancelled_date = now(),
    cancellation_reason = p_cancellation_reason
  where id = p_order_id;
  
  -- Increment customer's cancelled order count
  if v_order.customer_id is not null then
    update public.customers 
    set cancelled_order_count = cancelled_order_count + 1
    where id = v_order.customer_id;
  end if;
  
  return json_build_object(
    'success', true, 
    'message', 'Order cancelled and inventory restored successfully',
    'order_id', p_order_id,
    'quantity_restored', v_order.quantity
  );
  
exception when others then
  return json_build_object(
    'success', false, 
    'message', 'Error cancelling order: ' || sqlem
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.cancel_order(bigint, text) to authenticated;
