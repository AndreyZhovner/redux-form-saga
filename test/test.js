import 'babel-polyfill';
import { PROMISE, createFormAction, formActionSaga } from '../lib';
import { take, race, put, call } from 'redux-saga/effects';
import { expect } from 'chai';
import { isFSA } from 'flux-standard-action';

const PREFIX = 'PREFIX';
const REQUEST = `${PREFIX}_REQUEST`;
const SUCCESS = `${PREFIX}_SUCCESS`;
const FAILURE = `${PREFIX}_FAILURE`;

describe('redux-form-saga', () => {
  describe('createFormAction', () => {
    ['default', 'short'].forEach(function(type) {
      let formAction, action, dispatch, payload, promise, payloadCreator;
      let beforeFn = () => {
        dispatch = (a) => { action = a };
        payload = { mock: 'payload' };
        promise = formAction(payload, dispatch);
        payloadCreator = key => ({ key });
      };

      describe(`with the ${type} implementation`, function() {
        beforeEach(() => {
          if (type === 'default') {
            formAction = createFormAction(
              mockCreateLoginRequest(payloadCreator),
              [SUCCESS, FAILURE],
              payloadCreator
            );
          } else {
            formAction = createFormAction(PREFIX, payloadCreator);
          }

          beforeFn();
        })

        it('should return a promise', () => {
          expect(formAction).to.be.a('function');
          expect(formAction({}).then).to.be.a('function');
        });

        it('should dispatch an FSA compient action', () => {
          expect(isFSA(action)).to.equal(true);
        });

        it('should dispatch an action with the correct structure', () => {
          expect(action.payload).to.have.keys(['defer', 'request', 'types']);
          expect(action.payload.defer).to.have.keys(['reject', 'resolve']);
          expect(action.payload.request).to.have.keys(['payload', 'type']);
          expect(action.payload.types).to.be.an('array');
        });

        it('should dispatch an action with a defer with reject, resolve fns', () => {
          expect(action.payload.defer.reject).to.be.a('function');
          expect(action.payload.defer.resolve).to.be.a('function');
        });

        it('should dispatch an action with the correct request action', () => {
          expect(action.payload.request.payload).to.deep.equal({ key: payload });
          expect(action.payload.request.type).to.equal(REQUEST);
        });

        it('should dispatch an action with the correct types', () => {
          expect(action.payload.types[0]).to.equal(SUCCESS);
          expect(action.payload.types[1]).to.equal(FAILURE);
        });

        it('should return a promise', () => {
          expect(promise).to.be.a('promise');
        });
      });
    });
  });

  describe('formActionSaga', () => {
    let iterator, action, defer, request, types;

    beforeEach(() => {
      iterator = formActionSaga();
      defer = {
        resolve: () => {},
        reject: () => {}
      };
      request = {
        type: REQUEST,
        payload: {}
      };
      types = [ SUCCESS, FAILURE ];
      action = {
        type: PROMISE,
        payload: {
          defer,
          request,
          types
        }
      };
    });

    it('with a successful run it should yield with a TAKE of type FAILURE', () => {
      run({ success: 'A success' });
    });

    it('with a failed run it should yield with a TAKE of type FAILURE', () => {
      run({ fail: 'A failure!' });
    });

    function run(winner) {
      expect(iterator.next().value).to.deep.equal(
        take(PROMISE)
      );

      expect(iterator.next(action).value).to.deep.equal(
        put(request)
      );

      expect(iterator.next().value).to.deep.equal(
        race({ success: take(SUCCESS), fail: take(FAILURE) })
      );

      if (winner.success) {
        expect(iterator.next(winner).value).to.deep.equal(
          call(defer.resolve, winner.success)
        );
      } else {
        expect(iterator.next(winner).value).to.deep.equal(
          call(defer.reject, winner.fail)
        );
      }

      expect(iterator.next().value).to.deep.equal(
        take(PROMISE)
      );
    }

  });
});

function mockCreateLoginRequest(creator) {
  creator = creator || (ident => ident);
  return (data) => ({
    type: REQUEST,
    payload: creator(data)
  })
}
