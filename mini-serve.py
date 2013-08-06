# Chris Riederer
# Columbia University
# August, 2013

# Mini-server written so Jake can access parse via AJAX calls
import os, json, urllib2, urllib
import dateutil.parser
import datetime as dt
from flask import Flask, render_template
app = Flask(__name__)


def get_data(user_id, time1, time2, public):
    opener = urllib2.build_opener()
    opener.addheaders = [('X-Parse-Application-Id', 'EPwD8P7HsVS9YlILg9TGTRVTEYRKRAW6VcUN4a7z'),
                            ('X-Parse-REST-API-Key', '4y9bpzTnjiRYYLUd87cuLgNpSTDoEBW6rgDr2dQM')]
    params = urllib.urlencode({"where":json.dumps({
       "createdAt": {
         "$gte": {
           "__type": "Date",
           "iso": time1
           # "iso": "2013-06-09T18:02:52.249Z"
         },
         "$lte": {
           "__type": "Date",
           "iso": time2
           # "iso": "2013-06-09T18:02:52.249Z"
         },
       },
       # "addItem": user_id,
       "userName": user_id
        }),
        "order":"createdAt"
    })
    result = opener.open('https://api.parse.com/1/classes/LocationTableStudy?%s' % params)
    # result = opener.open('https://api.parse.com/1/classes/TestUser?%s' % params)

    # format time, don't give empty lon/lats, do some filtering
    parse_response =  result.read()
    # print parse_response
    out_json = json_to_lat_long_obj(parse_response, public)
    out = json.dumps(out_json)

    return out

def json_to_lat_long_obj(json_str, public):
    one_day = dt.timedelta(days=1)
    yesterday = dt.datetime.utcnow() - one_day

    json_dict = json.loads(json_str)
    items = json_dict['results']
    output = []
    for i in items:
        if i.has_key('latitude') and i.has_key('longitude'):
            out_item = {}
            # Get time, check that it's okay, and pass it on
            yourdate = dateutil.parser.parse(i['createdAt']).replace(tzinfo=None)
            if yourdate > yesterday and public: # If we're after midnight this morning, don't post
                print "skipping"
                continue
            date_str = yourdate.strftime('%I:%M%p %A, %B %d, %Y')
            out_item['time'] = date_str

            # Add latlong
            out_item['lat'] = i['latitude']
            out_item['long'] = i['longitude']
            
            # keywords
            if i.has_key('locationAssociations'):
                out_item['keywords'] = i['locationAssociations'].replace('[','').replace(']','').replace('"','')
            else:
                out_item['keywords'] = 'No Keywords'
            output.append(out_item)
    return output


@app.route('/data/<user_id>/<time1>/<time2>')
def get_public_ajax(user_id, time1, time2):
    print user_id
    return get_data(user_id, time1, time2, True)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Bind to PORT if defined, otherwise default to 5000
    port = int(os.environ.get('PORT', 80))
    app.debug = True
    app.run(host='0.0.0.0', port=port)