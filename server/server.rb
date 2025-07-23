require 'stripe'
require 'sinatra'
require 'json'

# Stripe API configuration
Stripe.api_key = 'sk_test_51RkEd8Q0JlKj0BQFMX77ZkDvBOXuXTqSpz8e7ez3Xo2JJ0AwFlgrRp4wCX3jFHlU7pCyU7KMAZoUnpbYvf08WsPE00kMMpGbkB'

set :static, true
set :port, 4242

# Your domain configuration
YOUR_DOMAIN = ENV['DOMAIN'] || 'http://localhost:4242'

# Enable CORS for development
before do
  headers 'Access-Control-Allow-Origin' => '*',
          'Access-Control-Allow-Methods' => ['OPTIONS', 'GET', 'POST'],
          'Access-Control-Allow-Headers' => 'Content-Type'
end

# Handle preflight requests
options '*' do
  200
end

# Create checkout session for one-time payments (website packages)
post '/create-checkout-session' do
  content_type 'application/json'
  
  begin
    # Parse the request body
    request_body = JSON.parse(request.body.read)
    
    # Validate required fields
    unless request_body['line_items'] && !request_body['line_items'].empty?
      halt 400, { error: { message: 'Line items are required' } }.to_json
    end
    
    # Create the checkout session
    session = Stripe::Checkout::Session.create({
      mode: request_body['mode'] || 'payment', # 'payment' for one-time, 'subscription' for recurring
      line_items: request_body['line_items'],
      success_url: request_body['success_url'] || "#{YOUR_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: request_body['cancel_url'] || "#{YOUR_DOMAIN}/cancel",
      automatic_tax: {
        enabled: true
      },
      customer_email: request_body['customer_email'],
      metadata: request_body['metadata'] || {},
      # Enable customer creation for potential future subscriptions
      customer_creation: 'always',
      # Add billing address collection
      billing_address_collection: 'required',
      # Add phone number collection
      phone_number_collection: {
        enabled: true
      }
    })
    
    { id: session.id, url: session.url }.to_json
    
  rescue Stripe::StripeError => e
    status 400
    { error: { message: e.message } }.to_json
  rescue JSON::ParserError => e
    status 400
    { error: { message: 'Invalid JSON in request body' } }.to_json
  rescue StandardError => e
    status 500
    { error: { message: 'An unexpected error occurred' } }.to_json
  end
end

# Create subscription checkout session (for monthly support)
post '/create-subscription-session' do
  content_type 'application/json'
  
  begin
    request_body = JSON.parse(request.body.read)
    
    # For subscriptions, we need to look up the price by lookup_key
    lookup_key = request_body['lookup_key'] || 'monthly_support'
    
    prices = Stripe::Price.list(
      lookup_keys: [lookup_key],
      expand: ['data.product']
    )
    
    if prices.data.empty?
      halt 400, { error: { message: "No price found for lookup key: #{lookup_key}" } }.to_json
    end
    
    session = Stripe::Checkout::Session.create({
      mode: 'subscription',
      line_items: [{
        quantity: 1,
        price: prices.data[0].id
      }],
      success_url: request_body['success_url'] || "#{YOUR_DOMAIN}/subscription-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: request_body['cancel_url'] || "#{YOUR_DOMAIN}/cancel",
      automatic_tax: {
        enabled: true
      },
      customer_email: request_body['customer_email'],
      metadata: request_body['metadata'] || {},
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true
      },
      # Add trial period if specified
      subscription_data: {
        trial_period_days: request_body['trial_days']
      }.compact
    })
    
    { id: session.id, url: session.url }.to_json
    
  rescue Stripe::StripeError => e
    status 400
    { error: { message: e.message } }.to_json
  rescue JSON::ParserError => e
    status 400
    { error: { message: 'Invalid JSON in request body' } }.to_json
  rescue StandardError => e
    status 500
    { error: { message: 'An unexpected error occurred' } }.to_json
  end
end

# Create customer portal session
post '/create-portal-session' do
  content_type 'application/json'
  
  begin
    request_body = JSON.parse(request.body.read)
    
    # Get customer ID from checkout session or direct customer ID
    customer_id = if request_body['session_id']
      checkout_session = Stripe::Checkout::Session.retrieve(request_body['session_id'])
      checkout_session.customer
    else
      request_body['customer_id']
    end
    
    unless customer_id
      halt 400, { error: { message: 'Customer ID or session ID is required' } }.to_json
    end
    
    return_url = request_body['return_url'] || YOUR_DOMAIN
    
    session = Stripe::BillingPortal::Session.create({
      customer: customer_id,
      return_url: return_url
    })
    
    { url: session.url }.to_json
    
  rescue Stripe::StripeError => e
    status 400
    { error: { message: e.message } }.to_json
  rescue JSON::ParserError => e
    status 400
    { error: { message: 'Invalid JSON in request body' } }.to_json
  rescue StandardError => e
    status 500
    { error: { message: 'An unexpected error occurred' } }.to_json
  end
end

# Retrieve checkout session details
get '/checkout-session/:session_id' do
  content_type 'application/json'
  
  begin
    session = Stripe::Checkout::Session.retrieve(
      params[:session_id],
      expand: ['line_items', 'customer']
    )
    
    session.to_json
    
  rescue Stripe::StripeError => e
    status 400
    { error: { message: e.message } }.to_json
  rescue StandardError => e
    status 500
    { error: { message: 'An unexpected error occurred' } }.to_json
  end
end

# Webhook endpoint for handling Stripe events
post '/webhook' do
  # Replace with your actual webhook secret from Stripe Dashboard
  webhook_secret = ENV['STRIPE_WEBHOOK_SECRET'] || 'whsec_your_webhook_secret_here'
  
  payload = request.body.read
  sig_header = request.env['HTTP_STRIPE_SIGNATURE']
  
  begin
    event = Stripe::Webhook.construct_event(
      payload, sig_header, webhook_secret
    )
  rescue JSON::ParserError => e
    puts "⚠️  Webhook error while parsing basic request. #{e.message}"
    status 400
    return
  rescue Stripe::SignatureVerificationError => e
    puts "⚠️  Webhook signature verification failed. #{e.message}"
    status 400
    return
  end
  
  # Handle the event
  case event.type
  when 'checkout.session.completed'
    session = event.data.object
    handle_successful_payment(session)
    
  when 'customer.subscription.created'
    subscription = event.data.object
    puts "🔔 Subscription created: #{subscription.id}"
    handle_subscription_created(subscription)
    
  when 'customer.subscription.updated'
    subscription = event.data.object
    puts "🔔 Subscription updated: #{subscription.id}"
    handle_subscription_updated(subscription)
    
  when 'customer.subscription.deleted'
    subscription = event.data.object
    puts "🔔 Subscription canceled: #{subscription.id}"
    handle_subscription_canceled(subscription)
    
  when 'invoice.payment_succeeded'
    invoice = event.data.object
    puts "🔔 Invoice payment succeeded: #{invoice.id}"
    handle_invoice_payment_succeeded(invoice)
    
  when 'invoice.payment_failed'
    invoice = event.data.object
    puts "🔔 Invoice payment failed: #{invoice.id}"
    handle_invoice_payment_failed(invoice)
    
  else
    puts "🤷‍♂️ Unhandled event type: #{event.type}"
  end
  
  status 200
end

# Helper methods for webhook handling

def handle_successful_payment(session)
  puts "🎉 Payment successful! Session ID: #{session.id}"
  puts "Customer: #{session.customer}"
  puts "Amount: #{session.amount_total}"
  puts "Metadata: #{session.metadata}"
  
  # Here you would typically:
  # 1. Update your database with the order
  # 2. Send confirmation email to customer
  # 3. Trigger project initiation workflow
  # 4. Notify your team
  
  # Example: Parse package data from metadata
  if session.metadata && session.metadata['package_data']
    begin
      package_data = JSON.parse(session.metadata['package_data'])
      puts "Package details: #{package_data}"
      
      # Process the package data
      process_website_order(session, package_data)
    rescue JSON::ParserError => e
      puts "Error parsing package data: #{e.message}"
    end
  end
end

def handle_subscription_created(subscription)
  puts "🔔 New subscription created for customer: #{subscription.customer}"
  
  # Here you would:
  # 1. Update customer record with subscription status
  # 2. Grant access to support features
  # 3. Send welcome email for support subscription
  
  # Example: Enable support features for customer
  enable_support_features(subscription.customer)
end

def handle_subscription_updated(subscription)
  puts "🔔 Subscription updated: #{subscription.id}"
  puts "Status: #{subscription.status}"
  
  # Handle subscription changes (pause, resume, plan changes)
  if subscription.status == 'active'
    enable_support_features(subscription.customer)
  elsif subscription.status == 'paused'
    pause_support_features(subscription.customer)
  end
end

def handle_subscription_canceled(subscription)
  puts "🔔 Subscription canceled: #{subscription.id}"
  
  # Disable support features but keep website active
  disable_support_features(subscription.customer)
  
  # Send cancellation confirmation email
  send_cancellation_email(subscription.customer)
end

def handle_invoice_payment_succeeded(invoice)
  puts "💰 Payment succeeded for invoice: #{invoice.id}"
  
  # For recurring subscription payments
  if invoice.subscription
    puts "Subscription payment for: #{invoice.subscription}"
    # Ensure customer has continued access to support features
    enable_support_features(invoice.customer)
  end
end

def handle_invoice_payment_failed(invoice)
  puts "❌ Payment failed for invoice: #{invoice.id}"
  
  # Handle failed subscription payments
  if invoice.subscription
    puts "Failed subscription payment for: #{invoice.subscription}"
    # You might want to send a dunning email or pause services
    handle_failed_subscription_payment(invoice)
  end
end

# Business logic methods (implement these based on your needs)

def process_website_order(session, package_data)
  # This is where you'd integrate with your project management system
  puts "Processing website order:"
  puts "- Base website: #{package_data['baseWebsite']}"
  puts "- Theme: #{package_data['theme']}"
  puts "- Features: #{package_data['features']}"
  puts "- Support: #{package_data['support']}"
  puts "- Total: $#{package_data['total']}"
  
  # Example integrations:
  # - Create project in your project management tool
  # - Send notification to your team
  # - Create customer record in your database
  # - Send confirmation email with next steps
end

def enable_support_features(customer_id)
  puts "🔧 Enabling support features for customer: #{customer_id}"
  # Implementation depends on your system:
  # - Update customer record in database
  # - Grant access to support portal
  # - Add to support team notifications
end

def disable_support_features(customer_id)
  puts "🚫 Disabling support features for customer: #{customer_id}"
  # - Remove access to support portal
  # - Update customer record
  # - Remove from support team notifications
end

def pause_support_features(customer_id)
  puts "⏸️ Pausing support features for customer: #{customer_id}"
  # - Temporarily disable support access
  # - Keep customer record but mark as paused
end

def send_cancellation_email(customer_id)
  puts "📧 Sending cancellation confirmation to customer: #{customer_id}"
  # - Send cancellation confirmation
  # - Provide information about website handover
  # - Include resubscription information
end

def handle_failed_subscription_payment(invoice)
  puts "🔄 Handling failed subscription payment for invoice: #{invoice.id}"
  # - Send payment failure notification
  # - Provide retry payment link
  # - Implement grace period logic
end

# Static file routes for your website
get '/' do
  send_file File.join(settings.public_folder, 'index.html')
end

get '/services/' do
  send_file File.join(settings.public_folder, 'services', 'index.html')
end

get '/contact/' do
  send_file File.join(settings.public_folder, 'contact', 'index.html')
end

get '/success' do
  send_file File.join(settings.public_folder, 'success.html')
end

get '/subscription-success' do
  send_file File.join(settings.public_folder, 'subscription-success.html')
end

get '/cancel' do
  send_file File.join(settings.public_folder, 'cancel.html')
end

# Health check endpoint
get '/health' do
  { status: 'ok', timestamp: Time.now.to_i }.to_json
end

puts "🚀 Server starting on port #{settings.port}"
puts "🌐 Domain: #{YOUR_DOMAIN}"
puts "🔑 Stripe API Key: #{Stripe.api_key[0..20]}..."