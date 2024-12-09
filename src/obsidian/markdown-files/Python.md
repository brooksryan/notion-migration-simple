---
tags:
  - coding
---
# Set up misc.
- How to Install and Manage Multiple Python Versions on Windows 10 | by David Littlefield | Level Up Coding (gitconnected.com)
- tensorflow - Downgrade Python version in virtual environment - Stack Overflow
- Environment Set Up
	 - Setting up a Python virtual environment:
		- Create a virtual environment: `python -m venv <path_to_venv>`
	- Activate the virtual environment:
		- Windows Command Prompt: `<path_to_venv>\Scripts\activate.bat`
		- Windows PowerShell: `.\<path_to_venv>\Scripts\Activate.ps1`
		- Mac `source .venv/bin/activate`
	- Deactivate the virtual environment: `deactivate`
	- Add environment variables at the bottom of Activate.ps1
		- $env:MY_VARIABLE = "my value"
## Package Management

### pipreqs for managing dependencies 
Based on the packages that are actually imported in the files
```.ps1
pip install pipreqs
pipreqs ./ --ignore .venv/,*.db


```
# Basic
## Input
getting user input
```python
val = input("Enter your value: ") 
print(val) 
```

## OS

### .isfile()
```python
os.path.isfile(f) # -> boolean check for regular files
```

### .listdir('path')
```python 
os.listdir('.') # -> creates a list of the files in a directory
```

### .getctime(f) & getmtime(f)
```python
.getctime(file) # -> returns EPOCH time of file created
.getmtime(file) # -> returns EPOCH time of file modified

# Snippet for using datetime
import datetime
timestamp = os.path.getmtime(path)
modified_datestamp = datetime.datetime.fromtimestamp(timestamp)
```

### .getcwd Get current working directory
```python
os.getcwd()
os.chdir('../') -> Changed directory to immediate parent directory
```

## sys

## Range
```python
range(start, end, increment)
range(n, 0, -1) # starts at n, ends at 0, increments -1

range(n, len(cogs)-1) # <- note the -1 is because cogs is a list and len-1 will be the last item because the list is indexed at 0


```
## Text
### Split
```python
string.split("{splitter}") -> splits string to list 
" ".join(thing) -> joins a list in to a string
```

### integer into list of separate numbers of integers
```python
n = 123
s = str(n)
## s = '123'
t = [*str]
t = ['1', '2', '3']
xn = [int(i) for i in [*str(n)]]
xn = [1, 2, 3]
```
### .format
```python

txt = "For only {price:.2f} dollars!"  
print(txt.format(price = 49))

def create_phone_number(n):
	return "({}{}{}) {}{}{}-{}{}{}{}".format(*n)

```
## Dictionaries
### Vars(Object ) -> turn class into dict
```python
vars(object) -> dictionary of the variables of the object
```

### zip(keys,values) Zip into dict
```python
keys = ['a', 'b', 'c']
values = [1, 2, 3]

# Use zip to pair each key with its corresponding value
# Then, use dict to convert these pairs into a dictionary
my_dict = dict(zip(keys, values))

print(my_dict)

# {'a': 1, 'b': 2, 'c': 3}
```

## Lists
### Add lists
```python
x = [1, 2, 3] 
y = [4, 5, 6]
[z] =  [x]+[y] 
print(z) = # Output: [1, 2, 3, 4, 5, 6]
```
### element-wise addition
``` python
x = [1, 2, 3] 
y = [4, 5, 6] 
z = [xi + yi for xi, yi in zip(x, y)] 
print(z)
```

### .count
```python 
def isValidWalk(walk: Array = ['n', 's', 'e', 'w']) -> Bool :
    if (walk.count('n') == walk.count('s') and 
        walk.count('e') == walk.count('w') and
        len(walk) == 10):
            return True
    return False
```
### .map
```python
def create_phone_number(n):
    n = ''.join(map(str,n))
    return '(%s) %s-%s'%(n[:3], n[3:6], n[6:])
```

## functools
### reduce
Performs a function over a list. In the below example x is the constant and y is the new item in the list. This is how I would multiply all of the items in the list together.
```python
from functools import reduce
>>> reduce(lambda x, y: x*y, [1, 2, 3, 4, 5, 6])
720
```
## Python Iterables
- Examples of Python iterables:
	- `[list]`
	-  `"string"`
	- `(tuple)`
- What Defines an Iterable Object?
- In Python, an object is considered iterable if it implements the iterator protocol, which requires an `__iter__()` method. This method must return an iterator object, which in turn must provide a `__next__()` method. Here’s a breakdown:
# SQLite
## Lag
```sql
LAG(column_name, offset, default_value) OVER (ORDER BY column_name)

SELECT date, sales, LAG(sales) OVER (ORDER BY date) AS previous_day_sales 
FROM sales;

-- Example in my code
UPDATE historical_bars_1_day
SET open_to_open_return = (open - LAG(open) OVER (ORDER BY date)) / LAG(open) OVER (ORDER BY date) * 100
WHERE date > (SELECT MIN(date) FROM your_table_name);

-- Using Partitioning
UPDATE your_table_name 
SET open_to_open_return = (open - LAG(open) OVER (PARTITION BY ticker ORDER BY date)) / LAG(open) OVER (PARTITION BY ticker ORDER BY date) * 100 WHERE date > (SELECT MIN(date) FROM your_table_name WHERE ticker = your_table_name.ticker);

```
- `column_name`: The name of the column you want to retrieve the previous value from.
- `offset`: The number of rows back you want to go. This is optional, and if not specified, it defaults to 1, which means the immediate previous row.
- `default_value`: This is also optional. It specifies the value to return if the `LAG` function goes beyond the beginning of the result set. If not specified, it defaults to `NULL`.

## JSON parsing
https://www.sqlite.org/json1.html#:~:text=Beginning%20with%20version%203.45.,that%20we%20call%20%22JSONB%22.
> By default, SQLite supports twenty-nine functions and two operators for dealing with JSON values. There are also two [table-valued functions](https://www.sqlite.org/vtab.html#tabfunc2) that can be used to decompose a JSON string.
## Delete
```sql
DELETE FROM your_table_name WHERE condition;
```
# Threading
Unthreaded
![[Pasted image 20240224143808.png]]
Threading in python is "fake threading" -> "can use the downtime of one thread to execute code in another thread."
![[Pasted image 20240224143828.png]]
- daemon threads get killed by main thread (non-blocking)
	- non-daemon threads are blocking
## Code Examples
### Snippets
#### Basics
```python
import threading

# Basic
threading.Thread(target=TARGET).start()

# Setting object as target in a variable
threaded_function = threading.Thread(target=TARGET)
threaded_function.start()
```
#### Join
```python
# .join()
threaded_function.join() # waits for the threads to finish before continuing
```
#### Lock
instantiating an object with a lock
```python 
class ThreadCounter:
    def __init__(self):
        self.count = 0
        self.lock = threading.Lock()  # Lock object

# Acquire lock
thing.lock.acquire()  # Acquire the lock
thing.lock.release()
```
#### Args
```python
# Passing an argument to a thread
VARIABLE = threading.Thread(target=TARGET_TO_THREAD, args=("argument 1",)) 
VARIABLE_2 = threading.Thread(target=TARGET_TO_THREAD, args=("another argument",))
# args is a tuple
```
#### Daemons
```python
# Daemons
new_worker1 = threading.Thread(target=worker, args=("text",), daemon=True)  
new_worker2 = threading.Thread(target=worker, args=("text",), daemon=False)
# daemon = true means when the whole app is finished the thread will end
# daemon = false will continue until it is done
```

### Practice
```python
import threading
import time

done = false 

def worker():
	counter = 0
	while not done:
		time.sleep(1)
		counter += 1
		print (counter)
		

worker()
input("press enter to quit")
done = true
```
Output
```output
1
2
3
4
5
# won't stop becuase we never get to the input because the worker will run endlessly
```

```python
import threading
import time

done = False
def worker(text):
    counter = 0
    while not done:
        time.sleep(1)
        counter += 1
        print(f"{counter} +  {text}")

new_worker = threading.Thread(
    target=worker, args=("text",), daemon=False
)  # args is a tuple so the comma is necessary

new_worker.start()
input("press enter to quit")
```
Output continues forever because Daemon = false and there's nothing to set it to true

# Time Package
```python
import time
time.sleep(seconds)
```

# Datetime

## Snippets

```python 

now = datetime.now()

# serializers
iso_from_datetime = now.isoformat() # datetime -> ISO
datetime_from_iso = datetime.fromisoformat(iso_date) # ISO -> datetime

epoch_from_datetime = now.timestamp() # datetime -> Epoch (current system TZ -> UTC)
datetime_from_epoch = datetime.fromtimestamp(epoch_from_datetime) # epoch -> datetime

# quick functions
datetime.strptime(date_string, "%Y-%m-%d %H:%M:%S")
now.strftime("%Y-%m-%d %H:%M:%S")

# DT Value reference
dt = datetime(
	year=2022, 
	month=3, 
	day=8, 
	hour=9,
	minute=30, 
	second=15, 
	microsecond=123456
) 


```

## Datetime Basics

> "f time" takes a datetime that turns into a string
> "p time" is a string time and a datetime is does make

### isocalendar()
The method `isocalendar()` when called on a `datetime` object returns a tuple containing three elements:
1. **ISO year**: The year number in the ISO week date system.
2. **ISO week number**: The week number according to the ISO standard, which can range from 1 to 53. ISO weeks start on Monday and the first week of the ISO year is the one that contains the first Thursday of the Gregorian year.
3. **ISO weekday**: A number representing the day of the week where Monday is 1 and Sunday is 7.xx`

```python
from datetime import datetime

#datetime object arguments
dt = datetime(
	year=2022, 
	month=3, 
	day=8, 
	hour=9,
	minute=30, 
	second=15, 
	microsecond=123456
) 
print(dt)

# Serializes to iso date to a date format -> string
now = datetime.now()

#datetime.isoformat()
serialized_date = now.isoformat() # serialize to iso type = string (aware/naive)
datetime_from_iso = datetime.fromisoformat(iso_date) # ISO -> datetime

#datetime.timestamp() epoch format
epoch_time_date = now.timestamp() # serialize to epoch type = int (assumes dt aware)
datetime_from_epoch = datetime.fromtimestamp(epoch_from_datetime) # epoch -> datetime
print(f"Serialized date: {serialized_date}")

# Seriealize to epoch

# **`datetime.now()`**: Returns the current date and time.
	now = datetime.now()

# datetime.strptime(): string -> datetime
	date_string = "2023-03-07 14:30:00" 
	date_obj = datetime.strptime(date_string, "%Y-%m-%d %H:%M:%S")
	date_obj.type == datetime


# datetime.strftime(): datetime -> string
	formatted_date = now.strftime("%Y-%m-%d %H:%M:%S")
	formatted_date.type == string

# timedelta 

# datetime formats
	- `%Y`: Year with century as a decimal number (e.g., 2023).
	- `%y`: Year without century as a zero-padded decimal number (e.g., 23 for 2023).
	- `%m`: Month as a zero-padded decimal number (e.g., 03 for March).
	- `%d`: Day of the month as a zero-padded decimal number (e.g., 09).
	- `%H`: Hour (24-hour clock) as a zero-padded decimal number (e.g., 14 for 2 PM).
	- `%I`: Hour (12-hour clock) as a zero-padded decimal number (e.g., 02 for 2 PM).
	- `%p`: AM or PM.
	- `%M`: Minute as a zero-padded decimal number (e.g., 30).
	- `%S`: Second as a zero-padded decimal number (e.g., 45).
	- `%f`: Microsecond as a decimal number, zero-padded on the left (e.g., 000123).
	- `%a`: Abbreviated weekday name (e.g., Mon).
	- `%A`: Full weekday name (e.g., Monday).
	- `%b`: Abbreviated month name (e.g., Mar).
	- `%B`: Full month name (e.g., March).
	- `%j`: Day of the year as a zero-padded decimal number (e.g., 068 for March 9).
	- `%U`: Week number of the year (Sunday as the first day of the week) as a zero-padded decimal number.
	- `%W`: Week number of the year (Monday as the first day of the week) as a zero-padded decimal number.
	- `%Z`: Time zone name (e.g., UTC, EST, PST).
	- `%z`: UTC offset in the form ±HHMM[SS[.ffffff]] (e.g., -0500 for Eastern Standard Time).
```

## Timezone
```python
## TIMEZONE STUFF with pytz and datetime.astimezone ##

# dt_object.astimezone() -> datetime function that changes the datetime of a dt object
	# Takes a pytz object as an argument
	# Assumes original timezone is my local timezone (PST)
dt_object.astimezone(pytz_timezone_object)


#importing pytz
from datetime import datetime import pytz 

# Create a timezone-aware datetime object 
utc_now = datetime.now(pytz.utc) 
print(f"Current time in UTC: {utc_now}") 

# use timezone_object.localize(datetime_object) -> NAIVE timezone 
DATETIME_OBJECT_WITH_TIMEZONE = TARGET_TIMEZONE_OBJECT.localize(NO_TZ_DATETIME_OBJECT)
dt_object = datetime.now()
utc_timezone = pytz.timezone('UTC')
dt_with_utc_timezone = utc_timezone.localize(dt_object)

	# same thing on one line
new_timezone = pytz.timezone('UTC').localize(naive_dt)


# dt_object.astimezone()

 
print(f"Current time in US/Eastern: {eastern_time}")

```


# Dataclasses

## Snippets
```python
@dataclass

class myNewClass:
	variable_one: str
	float_variable: float = 100

	def do_something(self) -> float:
		# math
		return float
	
```

# Stats, Numpy & Matlab & Pandas
See: [[Statistics Notes]]
## Pandas
## Basics
### Rename Columns
```python
	# one line
	new_df = pd.DataFrame(data=df.values, columns=names)

	# Make a copy
	df2 = df.copy()
    df2.columns = names
```
### Create a new sqlite table using Pandas
```python

conn = sqlite3.connect('my_database.db') # Step 5: Create a table in the database and insert the data 
df.to_sql('my_table', conn, if_exists='replace', index=False)
```

### Plotly Express SQL and Pandas
[Arjan doing pandas and plotly/dash stuff](https://youtu.be/GlRauKqI08Y?si=qr5bhDCMra-SFvzn)

## Stats and Random

### Vanilla Covariance
```python

def sample_covariance(X, Y):
    # Ensure X and Y have the same number of observations
    if len(X) != len(Y):
        raise ValueError("X and Y must have the same number of observations.")

    n = len(X)

    # Calculate the means of X and Y
    mean_X = sum(X) / n
    mean_Y = sum(Y) / n

    # Calculate the sum of the products of deviations from the mean for X and Y
    cov_sum = sum((X[i] - mean_X) * (Y[i] - mean_Y) for i in range(n))

    # Divide by n-1 to get the sample covariance
    covariance = cov_sum / (n - 1)

    return covariance
    
```
### Generating a random distribution
```python

random.gauss(mu, sigma) # <- Method 1
## not as thread-safe, more memory efficient because it caches the next number

random.normalvariate(mu,sigma) # Method 2
## thread safe, less memory efficient
```

# yfinance

```python
pip install "yfinance [nospam,repair] --upgrade --no-cache-dir
```
# Composition

*has* relationship
Separating relationships in object oriented programming

## Links:
[Why COMPOSITION is Better Than INHERITANCE - Detailed Python Example (youtube.com)](https://www.youtube.com/watch?v=0mcP8ZpUR38)
