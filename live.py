import os
import sys
import json
import time
import joblib
import requests
import shap
import pandas as pd
from openai import OpenAI


MODEL_FILE = 'weather_risk_model.pkl'
CONFIG_FILE = 'live_config.json'
OUT_FILE = 'latest_alerts.json'
TIMEZONE = 'Asia/Kolkata'
STALE_HOURS = 3         
GROQ_MODEL = 'openai/gpt-oss-120b'

WEATHER_URL = 'https://api.open-meteo.com/v1/forecast'
MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine'
WEATHER_VARS = ['temperature_2m', 'relative_humidity_2m', 'rain', 'pressure_msl',
                'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m']
MARINE_VARS = ['wave_height', 'wave_period', 'wave_direction',
               'swell_wave_height', 'swell_wave_period', 'swell_wave_direction']


bundle = joblib.load(MODEL_FILE)
model = bundle['model']
features = bundle['features']
medians = bundle['medians']              
explainer = shap.TreeExplainer(model)

with open(CONFIG_FILE, encoding='utf-8') as f:
    config = json.load(f)
moderate_cutoff = config['moderate_cutoff']
high_cutoff = config['high_cutoff']
severe_cutoff = config['severe_cutoff']
q75 = config['q75']                      
places = config['places']                
swell_tiers = config['swell_tiers']      


level_number = {'LOW': 0, 'MODERATE': 1, 'HIGH': 2, 'SEVERE': 3}
colour_of = {'LOW': 'Green', 'MODERATE': 'Yellow', 'HIGH': 'Orange', 'SEVERE': 'Red'}

units = {'rain': 'mm', 'wind_speed_10m': 'km/h', 'wind_gusts_10m': 'km/h',
         'wave_height': 'm', 'swell_wave_height': 'm', 'swell_wave_period': 's'}

friendly = {'rain': 'rain in last hour', 'wind_speed_10m': 'wind speed',
            'wind_gusts_10m': 'wind gusts', 'wave_height': 'wave height',
            'swell_wave_height': 'swell height', 'swell_wave_period': 'swell period'}

actions = {
    'LOW': 'No special action needed. Stay informed.',
    'MODERATE': 'Fishermen should be cautious. Check updates before going to sea.',
    'HIGH': 'Fishermen should avoid going to sea. Avoid beaches and secure boats.',
    'SEVERE': 'Do not go to sea. Move boats to harbour. Stay away from the coast.',
}

swell_note_en = 'Long-period swell is present, so waves can surge suddenly near the coast.'

level_ml = {'LOW': 'കുറഞ്ഞ', 'MODERATE': 'മിതമായ', 'HIGH': 'ഉയർന്ന', 'SEVERE': 'അതീവ ഗുരുതരമായ'}
colour_ml = {'Green': 'പച്ച', 'Yellow': 'മഞ്ഞ', 'Orange': 'ഓറഞ്ച്', 'Red': 'ചുവപ്പ്'}
actions_ml = {
    'LOW': 'പ്രത്യേക മുൻകരുതൽ ആവശ്യമില്ല. അറിയിപ്പുകൾ ശ്രദ്ധിക്കുക.',
    'MODERATE': 'മത്സ്യത്തൊഴിലാളികൾ ജാഗ്രത പാലിക്കുക. കടലിൽ പോകുംമുമ്പ് അറിയിപ്പുകൾ പരിശോധിക്കുക.',
    'HIGH': 'മത്സ്യത്തൊഴിലാളികൾ കടലിൽ പോകരുത്. ബീച്ചുകൾ ഒഴിവാക്കുക, ബോട്ടുകൾ സുരക്ഷിതമാക്കുക.',
    'SEVERE': 'കടലിൽ പോകരുത്. ബോട്ടുകൾ ഹാർബറിലേക്ക് മാറ്റുക. തീരത്തുനിന്ന് അകന്നു നിൽക്കുക.',
}
place_ml = {
    'Alappuzha': 'ആലപ്പുഴ', 'Kannur': 'കണ്ണൂർ', 'Kasaragod': 'കാസർഗോഡ്', 'Kochi': 'കൊച്ചി',
    'Kollam': 'കൊല്ലം', 'Kozhikode': 'കോഴിക്കോട്', 'Ponnani': 'പൊന്നാനി',
    'Thiruvananthapuram': 'തിരുവനന്തപുരം',
}


def to_malayalam_units(text):
    text = text.replace('km/h', 'കി.മീ/മണിക്കൂർ')
    text = text.replace(' mm', ' മി.മീ')
    text = text.replace(' m', ' മീ')
    return text


def format_value(value, unit):
    if pd.isna(value):
        return 'n/a'
    return str(round(float(value), 1)) + ' ' + unit


system_prompt = (
    "You write short coastal safety alerts for Kerala, India. "
    "Use ONLY the facts in the JSON. Never invent numbers, places or events. "
    "Never change the risk level or alert colour. "
    "Always write the location name exactly as given. Use the units given in the data. "
    "Write the risk level in lowercase (low, moderate, high, severe) and the colour with a capital "
    "letter (Green, Yellow, Orange, Red). "
    "Only the items listed in top_factors are the reasons for the risk. "
    "Mention other values as plain facts, never as reasons. "
    "If top_factors is empty, give no reasons. "
    "If top_factors contains 'long-period swell', state the swell period and swell height from the data. "
    "State values as numbers only. Never call a value high, elevated, heavy or strong. "
    "Keep the time window of each rain value in the text. Mention each value at most once. "
    "Never say conditions are 'safe'; say the risk is low, moderate, high or severe. "
    "Never say an alert is 'in effect' or 'issued'; describe it as CostGuard's risk estimate. "
    "Never suggest evacuation or any action not given in the data. "
    "Do not name any weather phenomenon that is not in the data. "
    "Use plain, natural English. "
    "Write exactly 2 short, simple sentences. Do not give advice. Do not mention model internals."
)

client = None
if os.environ.get('GROQ_API_KEY'):
    client = OpenAI(api_key=os.environ['GROQ_API_KEY'],
                    base_url='https://api.groq.com/openai/v1')


def numbers_have_units(text):
    text = text.replace(',', ' ').replace(';', ' ').replace('(', ' ').replace(')', ' ')
    words = text.split()
    unit_words = ['km/h', 'mm', 'm', 's', 'metres', 'meters', 'seconds', 'second', 'hours', 'hour']
    for i in range(len(words)):
        if words[i][0].isdigit():
            if i + 1 >= len(words):
                return False
            next_word = words[i + 1].strip('.')
            if next_word not in unit_words:
                return False
    return True


def get_summary(result, fallback):
    if client is None:
        return fallback
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=1500,
            temperature=0.2,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': 'Language: English\nAudience: fishermen\n' + json.dumps(result)},
            ],
        )
        text = response.choices[0].message.content.strip()
    except Exception as e:
        print('LLM failed, using fixed text instead:', e)
        return fallback
    if numbers_have_units(text) == False:
        print('LLM text had a number without a unit, using fixed text instead')
        return fallback
    return text


def swell_rule_level(row):
    period = row['swell_wave_period']
    height = row['swell_wave_height']
    if pd.isna(period) or pd.isna(height):
        return 'LOW'
    for tier in swell_tiers:
        if period >= tier[1] and height >= tier[2]:
            return tier[0]
    return 'LOW'


def predict_alert(row):
    values = []
    for name in features:
        value = row[name]
        if pd.isna(value):
            value = medians[name]
        values.append(float(value))
    X = pd.DataFrame([values], columns=features)

    probability = float(model.predict_proba(X)[0, 1])
    if probability < moderate_cutoff:
        ml_level = 'LOW'
    elif probability < high_cutoff:
        ml_level = 'MODERATE'
    elif probability < severe_cutoff:
        ml_level = 'HIGH'
    else:
        ml_level = 'SEVERE'

    swell_level = swell_rule_level(row)
    if level_number[swell_level] > level_number[ml_level]:
        level = swell_level
        raised_by_swell = True
    else:
        level = ml_level
        raised_by_swell = False
    colour = colour_of[level]


    reasons = []
    if ml_level != 'LOW':
        shap_values = explainer.shap_values(X)[0]
        used = []
        for turn in range(2):
            best_name = ''
            best_value = 0
            for i in range(len(features)):
                name = features[i]
                if name in used or name not in units or name not in q75:
                    continue
                if shap_values[i] > best_value and row[name] >= q75[name]:
                    best_name = name
                    best_value = shap_values[i]
            if best_name != '':
                reasons.append(friendly[best_name])
                used.append(best_name)
    if swell_level != 'LOW':
        reasons = ['long-period swell'] + reasons[:1]

    raw = {}
    for name in features:
        if name in units:
            raw[name] = format_value(row[name], units[name])
    rain24 = format_value(row['rain_24h'], 'mm')

    conditions = {}
    for name in raw:
        conditions[friendly[name]] = raw[name]
    conditions['rain in last 24 hours'] = rain24

    place = row['location']
    result = {
        'location': place,
        'risk_level': level,
        'alert_colour': colour,
        'top_factors': reasons,
        'conditions': conditions,
    }

    parts = []
    for name in conditions:
        parts.append(name + ' ' + conditions[name])
    details = ', '.join(parts)
    facts_en = level + ' coastal risk (' + colour + ' alert) at ' + place + '. ' + details + '.'

    swell_note = ''
    if swell_level != 'LOW':
        swell_note = swell_note_en + ' '
    template = facts_en + ' ' + swell_note + actions[level]

    c = {}
    for name in raw:
        c[name] = to_malayalam_units(raw[name])
    if place in place_ml:
        place_name = place_ml[place]
    else:
        place_name = place

    swell_ml = ''
    if swell_level != 'LOW':
        swell_ml = (' കള്ളക്കടൽ (ദൈർഘ്യമേറിയ തിരമാലകൾ) സാധ്യത: ഇടവേള '
                    + str(round(float(row['swell_wave_period']), 1))
                    + ' സെക്കൻഡ്, ഉയരം ' + c['swell_wave_height'] + '.')

    malayalam = (place_name + ': ' + level_ml[level] + ' തീരദേശ അപകടസാധ്യത ('
                 + colour_ml[colour] + ' അലർട്ട്). തിരമാല ' + c['wave_height']
                 + ', കാറ്റ് ' + c['wind_speed_10m']
                 + ', ഒരു മണിക്കൂറിലെ മഴ ' + c['rain']
                 + ', 24 മണിക്കൂറിലെ മഴ ' + to_malayalam_units(rain24) + '.'
                 + swell_ml + ' ' + actions_ml[level])

    english = get_summary(result, facts_en) + '\n' + swell_note + actions[level]

    return {
        'probability': round(probability, 3),
        'raised_by_swell_rule': raised_by_swell,
        'data': result,
        'template': template,
        'malayalam': malayalam,
        'english': english,
    }


def now_local():
    return pd.Timestamp.now(tz=TIMEZONE).tz_localize(None)


def fetch_hourly(url, variables, lat, lon, past_days=1):
    params = {
        'latitude': lat,
        'longitude': lon,
        'hourly': ','.join(variables),
        'past_days': past_days,
        'forecast_days': 1,
        'timezone': TIMEZONE,
    }
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, timeout=45)
            r.raise_for_status()
            return pd.DataFrame(r.json()['hourly'])
        except requests.RequestException as e:
            print('  retry', attempt + 1, 'after error:', e)
            time.sleep(3)
    raise ValueError('could not get data from ' + url)


def get_live_row(place, lat, lon):
    weather = fetch_hourly(WEATHER_URL, WEATHER_VARS, lat, lon)
    marine = fetch_hourly(MARINE_URL, MARINE_VARS, lat, lon)
    d = weather.merge(marine, on='time')
    d['time'] = pd.to_datetime(d['time'])

    d['rain_24h'] = d['rain'].rolling(24, min_periods=1).sum()   

    d = d[d['time'] <= now_local()]      
    d = d.ffill(limit=3)                 
    row = d.iloc[-1].copy()              

    row['location'] = place
    row['lat'] = lat
    row['lon'] = lon

    for name in features:
        if name not in row.index:
            raise ValueError('live data is missing: ' + name)
        if pd.isna(row[name]):
            print('  warning:', place, 'has an empty value for', name, '(the median will be used)')
    return row



def load_saved():
    old = {}
    if os.path.exists(OUT_FILE):
        try:
            with open(OUT_FILE, encoding='utf-8') as f:
                saved = json.load(f)
            for alert in saved['alerts']:
                old[alert['location']] = alert
        except Exception:
            pass
    return old


def refresh_alerts():
    old = load_saved()
    alerts = []
    for place in places:
        lat = places[place]['lat']
        lon = places[place]['lon']
        try:
            row = get_live_row(place, lat, lon)
            out = predict_alert(row)
            out['location'] = place
            out['hour'] = str(row['time'])
            alerts.append(out)
            print(place, out['data']['risk_level'], out['data']['alert_colour'],
                  '| ML probability', out['probability'],
                  '| swell rule', out['raised_by_swell_rule'],
                  '| hour', row['time'])
        except Exception as e:
            print(place, 'FAILED:', e)
            if place in old:
                alerts.append(old[place])
                print('   kept the previous alert (it shows as stale if it is old)')

    saved = {'generated_at': str(now_local()), 'alerts': alerts}
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(saved, f, ensure_ascii=False, indent=2)
    print('Saved', len(alerts), 'alerts to', OUT_FILE)


def get_alert(place):
    if not os.path.exists(OUT_FILE):
        return None
    with open(OUT_FILE, encoding='utf-8') as f:
        saved = json.load(f)
    for alert in saved['alerts']:
        if alert['location'].lower() == place.strip().lower():
            age = (now_local() - pd.Timestamp(alert['hour'])).total_seconds() / 3600
            alert['age_hours'] = round(age, 1)
            alert['stale'] = age > STALE_HOURS
            return alert
    return None


if __name__ == '__main__':
    args = sys.argv[1:]

    if len(args) > 0 and args[0] == 'loop':
        while True:
            refresh_alerts()
            print('Next refresh in 60 minutes...')
            time.sleep(3600)

    elif len(args) > 0:
        place = ' '.join(args)
        alert = get_alert(place)
        if alert is None:
            print('No alert for', place, '. Towns covered:', list(places))
        else:
            print(alert['location'], '|', alert['data']['risk_level'], alert['data']['alert_colour'],
                  '| data hour', alert['hour'], '| age', alert['age_hours'], 'hours')
            if alert['stale']:
                print('** STALE: the data is old **')
            print()
            print(alert['malayalam'])
            print()
            print(alert['english'])
            print()
            print('Note: ML-based support tool. Official IMD/INCOIS warnings take priority.')

    else:
        refresh_alerts()