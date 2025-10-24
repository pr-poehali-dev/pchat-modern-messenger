'''
Business: Manage chats - create, list, delete chats and groups
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with chat data
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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
            user_id = params.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id required'})
                }
            
            cur.execute("""
                SELECT c.id, c.name, c.avatar_url, c.is_group,
                       (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                       (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time
                FROM chats c
                INNER JOIN chat_members cm ON c.id = cm.chat_id
                WHERE cm.user_id = %s
                ORDER BY last_message_time DESC NULLS LAST
            """, (user_id,))
            
            chats = []
            for row in cur.fetchall():
                chat_data = {
                    'id': row[0],
                    'name': row[1],
                    'avatar_url': row[2],
                    'is_group': row[3],
                    'last_message': row[4],
                    'last_message_time': row[5].isoformat() if row[5] else None
                }
                
                if not row[3]:
                    cur.execute("""
                        SELECT u.nickname, u.avatar_url
                        FROM chat_members cm
                        INNER JOIN users u ON cm.user_id = u.id
                        WHERE cm.chat_id = %s AND cm.user_id != %s
                        LIMIT 1
                    """, (row[0], user_id))
                    other_user = cur.fetchone()
                    if other_user:
                        chat_data['name'] = other_user[0]
                        chat_data['avatar_url'] = other_user[1]
                
                chats.append(chat_data)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chats': chats})
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            user_id = body_data.get('user_id')
            is_group = body_data.get('is_group', False)
            name = body_data.get('name')
            avatar_url = body_data.get('avatar_url')
            members = body_data.get('members', [])
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id required'})
                }
            
            if is_group:
                cur.execute("""
                    INSERT INTO chats (name, avatar_url, is_group, created_by)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                """, (name, avatar_url, True, user_id))
                chat_id = cur.fetchone()[0]
                
                cur.execute("""
                    INSERT INTO chat_members (chat_id, user_id, is_owner)
                    VALUES (%s, %s, %s)
                """, (chat_id, user_id, True))
                
                for member_id in members:
                    if member_id != user_id:
                        cur.execute("""
                            INSERT INTO chat_members (chat_id, user_id, is_owner)
                            VALUES (%s, %s, %s)
                        """, (chat_id, member_id, False))
            else:
                other_user = body_data.get('other_user')
                if not other_user:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'other_user required for DM'})
                    }
                
                cur.execute("SELECT id FROM users WHERE username = %s", (other_user,))
                result = cur.fetchone()
                if not result:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                other_user_id = result[0]
                
                cur.execute("""
                    INSERT INTO chats (is_group, created_by)
                    VALUES (%s, %s)
                    RETURNING id
                """, (False, user_id))
                chat_id = cur.fetchone()[0]
                
                cur.execute("""
                    INSERT INTO chat_members (chat_id, user_id)
                    VALUES (%s, %s), (%s, %s)
                """, (chat_id, user_id, chat_id, other_user_id))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chat_id': chat_id}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            chat_id = body_data.get('chat_id')
            user_id = body_data.get('user_id')
            name = body_data.get('name')
            avatar_url = body_data.get('avatar_url')
            
            if not chat_id or not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id and user_id required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                UPDATE chats
                SET name = %s, avatar_url = %s
                WHERE id = %s AND created_by = %s
            """, (name, avatar_url, chat_id, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            params = event.get('pathParams', {})
            chat_id = params.get('id') or body_data.get('chat_id')
            user_id = body_data.get('user_id')
            
            if not chat_id or not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id and user_id required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                DELETE FROM chat_members
                WHERE chat_id = %s AND user_id = %s
            """, (chat_id, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()