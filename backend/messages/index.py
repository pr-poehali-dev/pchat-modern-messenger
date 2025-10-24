'''
Business: Handle chat messages - send, receive, and manage message status
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with messages or status
'''

import json
import os
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    import psycopg2
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            chat_id = params.get('chat_id')
            user_id = params.get('user_id')
            
            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id required'})
                }
            
            cur.execute("""
                SELECT m.id, m.content, m.file_url, m.is_system_message, m.created_at,
                       u.id, u.nickname, u.avatar_url
                FROM messages m
                LEFT JOIN users u ON m.sender_id = u.id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
            """, (chat_id,))
            
            messages = []
            for row in cur.fetchall():
                msg = {
                    'id': row[0],
                    'content': row[1],
                    'file_url': row[2],
                    'is_system_message': row[3],
                    'created_at': row[4].isoformat() if row[4] else None,
                    'sender': {
                        'id': row[5],
                        'nickname': row[6],
                        'avatar_url': row[7]
                    } if row[5] else None
                }
                
                if user_id and not row[3]:
                    cur.execute("""
                        SELECT is_delivered, is_read
                        FROM message_status
                        WHERE message_id = %s AND user_id = %s
                    """, (row[0], user_id))
                    status = cur.fetchone()
                    if status:
                        msg['is_delivered'] = status[0]
                        msg['is_read'] = status[1]
                
                messages.append(msg)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': messages})
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            chat_id = body_data.get('chat_id')
            sender_id = body_data.get('sender_id')
            content = body_data.get('content', '')
            file_url = body_data.get('file_url')
            is_system = body_data.get('is_system_message', False)
            
            if not chat_id or not sender_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id and sender_id required'})
                }
            
            cur.execute("""
                INSERT INTO messages (chat_id, sender_id, content, file_url, is_system_message)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (chat_id, sender_id, content, file_url, is_system))
            
            msg_id, created_at = cur.fetchone()
            
            cur.execute("""
                SELECT user_id FROM chat_members WHERE chat_id = %s AND user_id != %s
            """, (chat_id, sender_id))
            
            for (other_user_id,) in cur.fetchall():
                cur.execute("""
                    INSERT INTO message_status (message_id, user_id, is_delivered)
                    VALUES (%s, %s, %s)
                """, (msg_id, other_user_id, True))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message_id': msg_id,
                    'created_at': created_at.isoformat()
                })
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            message_id = body_data.get('message_id')
            user_id = body_data.get('user_id')
            action = body_data.get('action')
            
            if action == 'mark_read':
                cur.execute("""
                    UPDATE message_status
                    SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                    WHERE message_id = %s AND user_id = %s
                """, (message_id, user_id))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        cur.close()
        conn.close()
