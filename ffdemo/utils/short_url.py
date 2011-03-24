## {{{ http://code.activestate.com/recipes/576918/ (r1)
# Short URL Generator

DEFAULT_ALPHABET = 'JedR8LNFY2j6MrhkBSADUyfP5amuH9xQCX4VqbgpsGtnW7vc3TwKE'
DEFAULT_BLOCK_SIZE = 22

class UrlEncoder(object):
    def __init__(self, alphabet=DEFAULT_ALPHABET, block_size=DEFAULT_BLOCK_SIZE):
        self.alphabet = alphabet
        self.block_size = block_size
        self.mask = (1 << block_size) - 1
        self.mapping = range(block_size)
        self.mapping.reverse()
    def encode_url(self, n, min_length=0):
        return self.enbase(self.encode(n), min_length)
    def decode_url(self, n):
        return self.decode(self.debase(n))
    def encode(self, n):
        return (n & ~self.mask) | self._encode(n & self.mask)
    def _encode(self, n):
        result = 0
        for i, b in enumerate(self.mapping):
            if n & (1 << i):
                result |= (1 << b)
        return result
    def decode(self, n):
        return (n & ~self.mask) | self._decode(n & self.mask)
    def _decode(self, n):
        result = 0
        for i, b in enumerate(self.mapping):
            if n & (1 << b):
                result |= (1 << i)
        return result
    def enbase(self, x, min_length=0):
        result = self._enbase(x)
        padding = self.alphabet[0] * (min_length - len(result))
        return '%s%s' % (padding, result)
    def _enbase(self, x):
        n = len(self.alphabet)
        if x < n:
            return self.alphabet[x]
        return enbase(x/n) + self.alphabet[x%n]
    def debase(self, x):
        n = len(self.alphabet)
        result = 0
        for i, c in enumerate(reversed(x)):
            result += self.alphabet.index(c) * (n**i)
        return result

DEFAULT_ENCODER = UrlEncoder()

def encode(n):
    return DEFAULT_ENCODER.encode(n)

def decode(n):
    return DEFAULT_ENCODER.decode(n)

def enbase(n, min_length=0):
    return DEFAULT_ENCODER.enbase(n, min_length)

def debase(n):
    return DEFAULT_ENCODER.debase(n)

def encode_url(n, min_length=0):
    return DEFAULT_ENCODER.encode_url(n, min_length)

def decode_url(n):
    return DEFAULT_ENCODER.decode_url(n)

if __name__ == '__main__':
    for a in range(0, 200000, 37):
        b = encode(a)
        c = enbase(b)
        d = debase(c)
        e = decode(d)
        assert a == e
        assert b == d
        c = (' ' * (7 - len(c))) + c
        print '%6d %12d %s %12d %6d' % (a, b, c, d, e)

## end of http://code.activestate.com/recipes/576918/ }}}