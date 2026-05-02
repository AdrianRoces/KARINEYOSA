    -- Additional enhancements for order cancellation and stock tracking
    -- These views help monitor inventory status and cancellation history

    -- View to check remaining stock levels after any cancellations
    create or replace view public.inventory_status as
    select 
    p.id as product_id,
    p.name as product_name,
    p.variant_name,
    p.category,
    coalesce(s.total_quantity, 0) as total_stock,
    coalesce(s.remaining_quantity, 0) as remaining_stock,
    coalesce((select count(*) from public.orders o where o.product_id = p.id and o.status = 'Active'), 0) as active_orders_count,
    coalesce((select sum(quantity) from public.orders o where o.product_id = p.id and o.status = 'Active'), 0) as qty_in_active_orders,
    coalesce((select count(*) from public.orders o where o.product_id = p.id and o.status = 'Cancelled'), 0) as total_cancelled_orders,
    coalesce((select sum(quantity) from public.orders o where o.product_id = p.id and o.status = 'Cancelled'), 0) as total_qty_cancelled,
    p.ordered_from_instagram,
    p.ordered_from_facebook
    from public.products p
    left join public.sizes s on s.product_id = p.id
    order by p.name;

    -- View to track order cancellation history
    create or replace view public.cancellation_history as
    select 
    o.id as order_id,
    o.customer_name,
    o.product_name,
    o.quantity,
    o.platform,
    o.status,
    o.order_date,
    o.cancelled_date,
    o.cancellation_reason,
    case 
        when o.cancelled_date is not null then 
        extract(epoch from (o.cancelled_date - o.order_date)) / 3600 
        else null 
    end as hours_until_cancellation
    from public.orders o
    where o.status = 'Cancelled'
    order by o.cancelled_date desc;

    -- Function to verify stock restoration was successful
    create or replace function public.verify_stock_restoration(
    p_order_id bigint
    )
    returns json
    language plpgsql
    security definer
    as $$
    declare
    v_order record;
    v_remaining_stock int;
    v_total_stock int;
    begin
    -- Get order details
    select * into v_order from public.orders where id = p_order_id;
    
    if v_order is null then
        return json_build_object('success', false, 'message', 'Order not found');
    end if;
    
    -- Get current stock levels
    select 
        coalesce(remaining_quantity, 0),
        coalesce(total_quantity, 0)
    into v_remaining_stock, v_total_stock
    from public.sizes
    where product_id = v_order.product_id;
    
    return json_build_object(
        'order_id', p_order_id,
        'product_id', v_order.product_id,
        'product_name', v_order.product_name,
        'order_quantity', v_order.quantity,
        'current_remaining_stock', v_remaining_stock,
        'total_stock', v_total_stock,
        'order_status', v_order.status,
        'cancelled_date', v_order.cancelled_date,
        'verification_passed', v_order.status = 'Cancelled'
    );
    
    exception when others then
    return json_build_object(
        'success', false,
        'message', 'Error verifying stock restoration: ' || sqlem
    );
    end;
    $$;

    grant execute on function public.verify_stock_restoration(bigint) to authenticated;

    -- Function to bulk restore stock for multiple orders in a transaction
    create or replace function public.bulk_restore_stock_for_transaction(
    p_transaction_id text,
    p_cancellation_reason text
    )
    returns json
    language plpgsql
    security definer
    as $$
    declare
    v_order_id bigint;
    v_result record;
    v_restored_count int := 0;
    v_failed_count int := 0;
    v_error_msg text;
    begin
    -- Get all active orders with this transaction_id
    for v_order_id in 
        select id from public.orders 
        where transaction_id = p_transaction_id 
        and status != 'Cancelled'
    loop
        begin
        -- Cancel each order
        select (public.cancel_order(v_order_id, p_cancellation_reason))::json into v_result;
        v_restored_count := v_restored_count + 1;
        exception when others then
        v_failed_count := v_failed_count + 1;
        v_error_msg := sqlem;
        end;
    end loop;
    
    return json_build_object(
        'transaction_id', p_transaction_id,
        'orders_restored', v_restored_count,
        'orders_failed', v_failed_count,
        'success', v_failed_count = 0,
        'message', case 
        when v_failed_count = 0 then 'All orders cancelled and stock restored successfully'
        else 'Some orders failed to cancel: ' || v_error_msg
        end
    );
    
    exception when others then
    return json_build_object(
        'success', false,
        'message', 'Error bulk restoring stock: ' || sqlem
    );
    end;
    $$;

    grant execute on function public.bulk_restore_stock_for_transaction(text, text) to authenticated;
